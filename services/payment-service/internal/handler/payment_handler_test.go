package handler_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"ecommerce-platform/packages/shared-go/database"
	"ecommerce-platform/services/payment-service/internal/event"
	"ecommerce-platform/services/payment-service/internal/handler"
	"ecommerce-platform/services/payment-service/internal/infrastructure/entity"
	"ecommerce-platform/services/payment-service/internal/infrastructure/repository"
)

type mockPaymentProducer struct {
	publishedEvents []map[string]interface{}
}

var _ event.PaymentProducer = (*mockPaymentProducer)(nil)

func (m *mockPaymentProducer) PublishPaymentCompleted(orderID, paymentID, userID string, amount int64) error {
	m.publishedEvents = append(m.publishedEvents, map[string]interface{}{
		"order_id":   orderID,
		"payment_id": paymentID,
		"user_id":    userID,
		"amount":     amount,
	})
	return nil
}

func setupTestPaymentEnv(t *testing.T) (*handler.PaymentHandler, *mockPaymentProducer) {
	db, err := database.NewTestDB()
	if err != nil {
		t.Fatalf("failed to create test db: %v", err)
	}
	if err := db.AutoMigrate(&entity.Payment{}); err != nil {
		t.Fatalf("failed to auto migrate: %v", err)
	}
	repo := repository.NewGormPaymentRepository(db)
	producer := &mockPaymentProducer{}
	return handler.NewPaymentHandlerWithProducer(repo, producer), producer
}

func TestCreatePaymentGeneratesQRISAndVANumber(t *testing.T) {
	h, _ := setupTestPaymentEnv(t)

	// 1. Test QRIS
	qrisPayload, _ := json.Marshal(map[string]interface{}{
		"order_id":       "ord-qris-1",
		"user_id":        "usr-1",
		"amount":         150000,
		"payment_method": "QRIS",
	})
	reqQRIS := httptest.NewRequest(http.MethodPost, "/api/v1/payments", bytes.NewReader(qrisPayload))
	recQRIS := httptest.NewRecorder()
	h.CreatePayment(recQRIS, reqQRIS)

	if recQRIS.Code != http.StatusCreated {
		t.Fatalf("expected 201 for QRIS, got %d: %s", recQRIS.Code, recQRIS.Body.String())
	}
	var resQRIS struct {
		Data entity.Payment `json:"data"`
	}
	json.NewDecoder(recQRIS.Body).Decode(&resQRIS)
	if resQRIS.Data.QRString == "" {
		t.Fatal("expected non-empty qr_string for QRIS payment")
	}

	// 2. Test BCA_VA
	vaPayload, _ := json.Marshal(map[string]interface{}{
		"order_id":       "ord-va-1",
		"user_id":        "usr-1",
		"amount":         250000,
		"payment_method": "BCA_VA",
	})
	reqVA := httptest.NewRequest(http.MethodPost, "/api/v1/payments", bytes.NewReader(vaPayload))
	recVA := httptest.NewRecorder()
	h.CreatePayment(recVA, reqVA)

	if recVA.Code != http.StatusCreated {
		t.Fatalf("expected 201 for VA, got %d: %s", recVA.Code, recVA.Body.String())
	}
	var resVA struct {
		Data entity.Payment `json:"data"`
	}
	json.NewDecoder(recVA.Body).Decode(&resVA)
	if resVA.Data.VANumber == "" {
		t.Fatal("expected non-empty va_number for BCA_VA payment")
	}
}

func TestSimulatePaymentSuccess(t *testing.T) {
	h, producer := setupTestPaymentEnv(t)

	// Create initial payment
	payload, _ := json.Marshal(map[string]interface{}{
		"order_id":       "ord-sim-1",
		"user_id":        "usr-tokopedia",
		"amount":         300000,
		"payment_method": "QRIS",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/payments", bytes.NewReader(payload))
	rec := httptest.NewRecorder()
	h.CreatePayment(rec, req)

	var res struct {
		Data entity.Payment `json:"data"`
	}
	json.NewDecoder(rec.Body).Decode(&res)
	paymentID := res.Data.ID

	// Simulate payment success
	simReq := httptest.NewRequest(http.MethodPost, "/api/v1/payments/"+paymentID+"/simulate", nil)
	recSim := httptest.NewRecorder()
	h.SimulatePayment(recSim, simReq)

	if recSim.Code != http.StatusOK {
		t.Fatalf("expected 200 from simulate, got %d: %s", recSim.Code, recSim.Body.String())
	}

	if len(producer.publishedEvents) != 1 {
		t.Fatalf("expected 1 event published, got %d", len(producer.publishedEvents))
	}
	if producer.publishedEvents[0]["order_id"] != "ord-sim-1" {
		t.Fatalf("expected published event for ord-sim-1, got %v", producer.publishedEvents[0])
	}
}

func TestSimulatePaymentFailure(t *testing.T) {
	h, producer := setupTestPaymentEnv(t)

	// Create initial payment
	payload, _ := json.Marshal(map[string]interface{}{
		"order_id":       "ord-fail-1",
		"user_id":        "usr-tokopedia",
		"amount":         500000,
		"payment_method": "BCA_VA",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/payments", bytes.NewReader(payload))
	rec := httptest.NewRecorder()
	h.CreatePayment(rec, req)

	var res struct {
		Data entity.Payment `json:"data"`
	}
	json.NewDecoder(rec.Body).Decode(&res)
	paymentID := res.Data.ID

	// Simulate payment failure
	failPayload, _ := json.Marshal(map[string]interface{}{
		"action": "fail",
		"reason": "Saldo tidak mencukupi",
	})
	simReq := httptest.NewRequest(http.MethodPost, "/api/v1/payments/"+paymentID+"/simulate", bytes.NewReader(failPayload))
	recSim := httptest.NewRecorder()
	h.SimulatePayment(recSim, simReq)

	if recSim.Code != http.StatusPaymentRequired && recSim.Code != http.StatusBadRequest {
		t.Fatalf("expected 402 or 400 from simulate failure, got %d: %s", recSim.Code, recSim.Body.String())
	}

	// Ensure no RabbitMQ payment.completed event published
	if len(producer.publishedEvents) != 0 {
		t.Fatalf("expected 0 events published on failure, got %d", len(producer.publishedEvents))
	}

	// Check payment status is FAILED
	getReq := httptest.NewRequest(http.MethodGet, "/api/v1/payments/"+paymentID, nil)
	recGet := httptest.NewRecorder()
	h.GetPaymentByID(recGet, getReq)

	var resGet struct {
		Data entity.Payment `json:"data"`
	}
	json.NewDecoder(recGet.Body).Decode(&resGet)
	if resGet.Data.Status != "FAILED" {
		t.Fatalf("expected payment status FAILED, got %s", resGet.Data.Status)
	}
}

func TestWebhookRaceConditionConcurrency(t *testing.T) {
	h, producer := setupTestPaymentEnv(t)

	// Create initial payment
	payload, _ := json.Marshal(map[string]interface{}{
		"order_id":       "ord-race-1",
		"user_id":        "usr-race",
		"amount":         1000000,
		"payment_method": "QRIS",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/payments", bytes.NewReader(payload))
	rec := httptest.NewRecorder()
	h.CreatePayment(rec, req)

	var res struct {
		Data entity.Payment `json:"data"`
	}
	json.NewDecoder(rec.Body).Decode(&res)
	paymentID := res.Data.ID

	// Simulate 10 simultaneous webhook/simulation calls racing to finalize payment
	concurrency := 10
	type result struct {
		statusCode int
		body       string
	}
	results := make(chan result, concurrency)

	for i := 0; i < concurrency; i++ {
		go func() {
			webhookPayload, _ := json.Marshal(map[string]interface{}{
				"payment_id":         paymentID,
				"order_id":           "ord-race-1",
				"transaction_status": "settlement",
			})
			wReq := httptest.NewRequest(http.MethodPost, "/api/v1/payments/webhook", bytes.NewReader(webhookPayload))
			wRec := httptest.NewRecorder()
			h.HandleWebhook(wRec, wReq)
			results <- result{statusCode: wRec.Code, body: wRec.Body.String()}
		}()
	}

	for i := 0; i < concurrency; i++ {
		r := <-results
		if r.statusCode != http.StatusOK {
			t.Errorf("expected 200 OK for concurrent webhook, got %d: %s", r.statusCode, r.body)
		}
	}

	// Critical assertion: EXACTLY 1 event must be published to RabbitMQ despite 10 concurrent hits
	if len(producer.publishedEvents) != 1 {
		t.Fatalf("RACE CONDITION DETECTED! Expected exactly 1 event published, got %d", len(producer.publishedEvents))
	}
}
