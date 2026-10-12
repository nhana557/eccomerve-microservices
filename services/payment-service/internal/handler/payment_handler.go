package handler

import (
	"encoding/json"
	"errors"
	"fmt"
	"math/rand"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"ecommerce-platform/packages/shared-go/response"
	"ecommerce-platform/services/payment-service/internal/event"
	"ecommerce-platform/services/payment-service/internal/infrastructure/entity"
	"ecommerce-platform/services/payment-service/internal/infrastructure/repository"
	"gorm.io/gorm"
)

type PaymentHandler struct {
	repo     repository.PaymentRepository
	producer event.PaymentProducer
	locks    sync.Map
}

func (h *PaymentHandler) lockPayment(key string) func() {
	if key == "" {
		return func() {}
	}
	val, _ := h.locks.LoadOrStore(key, &sync.Mutex{})
	mtx := val.(*sync.Mutex)
	mtx.Lock()
	return func() {
		mtx.Unlock()
	}
}

func NewPaymentHandler(repo repository.PaymentRepository) *PaymentHandler {
	return &PaymentHandler{repo: repo}
}

func NewPaymentHandlerWithProducer(repo repository.PaymentRepository, producer event.PaymentProducer) *PaymentHandler {
	return &PaymentHandler{
		repo:     repo,
		producer: producer,
	}
}

type CreatePaymentRequest struct {
	OrderID       string `json:"order_id"`
	UserID        string `json:"user_id"`
	Amount        int64  `json:"amount"`
	PaymentMethod string `json:"payment_method"`
}

type UpdatePaymentStatusRequest struct {
	Status string `json:"status"`
}

func generateVANumber(method string) string {
	bankPrefix := "88012"
	switch strings.ToUpper(method) {
	case "BCA_VA":
		bankPrefix = "88012"
	case "MANDIRI_VA":
		bankPrefix = "89022"
	case "BRI_VA":
		bankPrefix = "88033"
	case "BNI_VA":
		bankPrefix = "88044"
	}
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	suffix := r.Int63n(90000000000) + 10000000000
	return fmt.Sprintf("%s%d", bankPrefix, suffix)
}

func generateQRISPayload(orderID string, amount int64) string {
	return fmt.Sprintf("00020101021226670016ID.CO.TOKOPEDIA.WWW01189360000000000000010215%s5204581253033605406%d5802ID5913TokopediaPay6007Jakarta62150111%s6304ABCD",
		orderID, amount, orderID)
}

func (h *PaymentHandler) CreatePayment(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		response.Error(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "payment-service")
		return
	}

	var req CreatePaymentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_PAYLOAD", "Invalid request body", "payment-service")
		return
	}

	req.OrderID = strings.TrimSpace(req.OrderID)
	req.PaymentMethod = strings.ToUpper(strings.TrimSpace(req.PaymentMethod))
	if req.OrderID == "" || req.Amount <= 0 || req.PaymentMethod == "" {
		response.Error(w, http.StatusBadRequest, "VALIDATION_FAILED", "Order ID, positive amount, and payment method are required", "payment-service")
		return
	}

	userID := strings.TrimSpace(req.UserID)
	if userID == "" {
		userID = strings.TrimSpace(r.Header.Get("X-User-Id"))
	}
	if userID == "" {
		userID = strings.TrimSpace(r.URL.Query().Get("user_id"))
	}

	// Idempotency check: if payment already exists for this order
	existing, _ := h.repo.GetByOrderID(r.Context(), req.OrderID)
	if existing != nil {
		response.JSON(w, http.StatusOK, existing, "payment-service")
		return
	}

	var vaNumber, qrString string
	if req.PaymentMethod == "QRIS" {
		qrString = generateQRISPayload(req.OrderID, req.Amount)
	} else if strings.HasSuffix(req.PaymentMethod, "_VA") || req.PaymentMethod == "BANK_TRANSFER" {
		vaNumber = generateVANumber(req.PaymentMethod)
	}

	payment := entity.Payment{
		OrderID:       req.OrderID,
		UserID:        userID,
		Amount:        req.Amount,
		PaymentMethod: req.PaymentMethod,
		Status:        "PENDING",
		VANumber:      vaNumber,
		QRString:      qrString,
	}

	if err := h.repo.Create(r.Context(), &payment); err != nil {
		response.Error(w, http.StatusInternalServerError, "DATABASE_ERROR", err.Error(), "payment-service")
		return
	}

	response.JSON(w, http.StatusCreated, payment, "payment-service")
}

type PaymentWebhookPayload struct {
	PaymentID         string `json:"payment_id"`
	OrderID           string `json:"order_id"`
	TransactionStatus string `json:"transaction_status"` // settlement, capture, expire, cancel, deny
	StatusCode        string `json:"status_code"`
	Reason            string `json:"reason"`
}

type SimulatePaymentRequest struct {
	Action string `json:"action"` // "success" or "fail"
	Status string `json:"status"` // "SUCCESS" or "FAILED"
	Reason string `json:"reason"`
}

func (h *PaymentHandler) SimulatePayment(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		response.Error(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "payment-service")
		return
	}

	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	var paymentID string
	for i, p := range parts {
		if p == "simulate" && i > 0 {
			paymentID = parts[i-1]
			break
		}
	}
	if paymentID == "" {
		paymentID = r.URL.Query().Get("id")
	}

	if paymentID == "" {
		response.Error(w, http.StatusBadRequest, "MISSING_ID", "Payment ID is required", "payment-service")
		return
	}

	unlock := h.lockPayment(paymentID)
	defer unlock()

	payment, err := h.repo.GetByID(r.Context(), paymentID)
	if err != nil {
		response.Error(w, http.StatusNotFound, "NOT_FOUND", "Payment record not found", "payment-service")
		return
	}

	var simReq SimulatePaymentRequest
	if r.Body != nil {
		_ = json.NewDecoder(r.Body).Decode(&simReq)
	}
	action := r.URL.Query().Get("action")
	if action != "" {
		simReq.Action = action
	}

	isFailureSimulation := strings.EqualFold(simReq.Action, "fail") ||
		strings.EqualFold(simReq.Action, "error") ||
		strings.EqualFold(simReq.Status, "FAILED")

	if isFailureSimulation {
		reason := simReq.Reason
		if reason == "" {
			reason = "Saldo tidak mencukupi atau kartu ditolak oleh bank (Simulated Error)"
		}

		if payment.Status == "SUCCESS" {
			response.Error(w, http.StatusBadRequest, "ALREADY_PAID", "Pembayaran sudah lunas dan tidak dapat digagalkan", "payment-service")
			return
		}

		now := time.Now().UTC()
		_, _ = h.repo.UpdateStatusAtomic(r.Context(), payment.ID, "PENDING", "FAILED", &now)
		payment.Status = "FAILED"

		response.Error(w, http.StatusPaymentRequired, "PAYMENT_FAILED", fmt.Sprintf("Simulasi pembayaran gagal: %s", reason), "payment-service")
		return
	}

	// If already SUCCESS, return idempotently
	if payment.Status == "SUCCESS" {
		response.JSON(w, http.StatusOK, map[string]interface{}{
			"message": "Pembayaran sudah berstatus lunas sebelumnya (Idempotent)",
			"payment": payment,
		}, "payment-service")
		return
	}

	now := time.Now().UTC()
	// Atomic CAS: Only transition if current status is PENDING
	swapped, err := h.repo.UpdateStatusAtomic(r.Context(), payment.ID, "PENDING", "SUCCESS", &now)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "DATABASE_ERROR", err.Error(), "payment-service")
		return
	}

	payment.Status = "SUCCESS"
	payment.PaidAt = &now
	payment.TransactionTime = &now

	if swapped {
		// Only the winner of the atomic transition publishes the event
		if h.producer != nil {
			_ = h.producer.PublishPaymentCompleted(payment.OrderID, payment.ID, payment.UserID, payment.Amount)
		}
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"message":   "Simulasi pembayaran berhasil! Status order diperbarui menjadi PAID.",
		"payment":   payment,
		"swapped":   swapped,
		"duplicate": !swapped,
	}, "payment-service")
}

func (h *PaymentHandler) HandleWebhook(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		response.Error(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "payment-service")
		return
	}

	var payload PaymentWebhookPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_PAYLOAD", "Payload webhook JSON tidak valid", "payment-service")
		return
	}

	lockKey := payload.PaymentID
	if lockKey == "" {
		lockKey = payload.OrderID
	}
	unlock := h.lockPayment(lockKey)
	defer unlock()

	var payment *entity.Payment
	var err error
	if payload.PaymentID != "" {
		payment, err = h.repo.GetByID(r.Context(), payload.PaymentID)
	} else if payload.OrderID != "" {
		payment, err = h.repo.GetByOrderID(r.Context(), payload.OrderID)
	}

	if err != nil || payment == nil {
		response.Error(w, http.StatusNotFound, "PAYMENT_NOT_FOUND", "Data pembayaran tidak ditemukan", "payment-service")
		return
	}

	txStatus := strings.ToLower(payload.TransactionStatus)
	now := time.Now().UTC()

	switch txStatus {
	case "settlement", "capture", "success":
		// Atomic Compare-And-Swap (CAS) to prevent race condition & double event publishing
		swapped, err := h.repo.UpdateStatusAtomic(r.Context(), payment.ID, "PENDING", "SUCCESS", &now)
		if err != nil {
			response.Error(w, http.StatusInternalServerError, "DATABASE_ERROR", err.Error(), "payment-service")
			return
		}

		if swapped {
			if h.producer != nil {
				_ = h.producer.PublishPaymentCompleted(payment.OrderID, payment.ID, payment.UserID, payment.Amount)
			}
			response.JSON(w, http.StatusOK, map[string]interface{}{
				"status":  "OK",
				"message": "Pembayaran berhasil diverifikasi via webhook",
				"swapped": true,
			}, "payment-service")
			return
		}

		// If swapped is false, status was already updated (concurrent duplicate webhook handled gracefully)
		response.JSON(w, http.StatusOK, map[string]interface{}{
			"status":  "ALREADY_PROCESSED",
			"message": "Webhook diterima tetapi diabaikan karena pembayaran sudah diproses (Idempotent)",
			"swapped": false,
		}, "payment-service")

	case "expire", "cancel", "deny", "failed":
		swapped, _ := h.repo.UpdateStatusAtomic(r.Context(), payment.ID, "PENDING", "FAILED", &now)
		response.JSON(w, http.StatusOK, map[string]interface{}{
			"status":  "OK",
			"message": "Status pembayaran diperbarui menjadi FAILED via webhook",
			"swapped": swapped,
		}, "payment-service")

	default:
		response.JSON(w, http.StatusOK, map[string]interface{}{
			"status":  "IGNORED",
			"message": fmt.Sprintf("Status transaksi '%s' tidak memerlukan aksi perubahan", txStatus),
		}, "payment-service")
	}
}

func (h *PaymentHandler) GetPaymentByID(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		if len(parts) >= 4 {
			id = parts[3]
		}
	}

	if id == "" {
		response.Error(w, http.StatusBadRequest, "MISSING_ID", "Payment ID is required", "payment-service")
		return
	}

	payment, err := h.repo.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "Payment not found", "payment-service")
			return
		}
		response.Error(w, http.StatusInternalServerError, "DATABASE_ERROR", err.Error(), "payment-service")
		return
	}

	response.JSON(w, http.StatusOK, payment, "payment-service")
}

func (h *PaymentHandler) GetPaymentByOrderID(w http.ResponseWriter, r *http.Request) {
	orderID := r.URL.Query().Get("order_id")
	if orderID == "" {
		parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		if len(parts) >= 5 && parts[len(parts)-2] == "order" {
			orderID = parts[len(parts)-1]
		}
	}

	if orderID == "" {
		response.Error(w, http.StatusBadRequest, "MISSING_ORDER_ID", "Order ID is required", "payment-service")
		return
	}

	payment, err := h.repo.GetByOrderID(r.Context(), orderID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "Payment for order not found", "payment-service")
			return
		}
		response.Error(w, http.StatusInternalServerError, "DATABASE_ERROR", err.Error(), "payment-service")
		return
	}

	response.JSON(w, http.StatusOK, payment, "payment-service")
}

func (h *PaymentHandler) ListPayments(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	payments, total, err := h.repo.List(r.Context(), limit, offset)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "DATABASE_ERROR", err.Error(), "payment-service")
		return
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"payments": payments,
		"total":    total,
	}, "payment-service")
}

func (h *PaymentHandler) UpdatePaymentStatus(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		if len(parts) >= 4 {
			id = parts[3]
		}
	}

	var req UpdatePaymentStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_PAYLOAD", "Invalid request body", "payment-service")
		return
	}

	if strings.TrimSpace(req.Status) == "" {
		response.Error(w, http.StatusBadRequest, "VALIDATION_FAILED", "Status is required", "payment-service")
		return
	}

	var txTime *time.Time
	if req.Status == "SUCCESS" {
		now := time.Now().UTC()
		txTime = &now
	}

	if err := h.repo.UpdateStatus(r.Context(), id, req.Status, txTime); err != nil {
		response.Error(w, http.StatusInternalServerError, "DATABASE_ERROR", err.Error(), "payment-service")
		return
	}

	if req.Status == "SUCCESS" && h.producer != nil {
		if payment, err := h.repo.GetByID(r.Context(), id); err == nil {
			_ = h.producer.PublishPaymentCompleted(payment.OrderID, payment.ID, payment.UserID, payment.Amount)
		}
	}

	response.JSON(w, http.StatusOK, map[string]string{
		"message": "Payment status updated successfully",
		"status":  req.Status,
	}, "payment-service")
}

func (h *PaymentHandler) DeletePayment(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		if len(parts) >= 4 {
			id = parts[3]
		}
	}

	if err := h.repo.Delete(r.Context(), id); err != nil {
		response.Error(w, http.StatusInternalServerError, "DATABASE_ERROR", err.Error(), "payment-service")
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"message": "Payment deleted successfully"}, "payment-service")
}
