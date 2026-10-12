package event_test

import (
	"encoding/json"
	"testing"

	"ecommerce-platform/packages/shared-go/database"
	"ecommerce-platform/services/product-service/internal/event"
	"ecommerce-platform/services/product-service/internal/infrastructure/entity"
)

func TestProcessStockDeductionPayloadDeductsStockAtomically(t *testing.T) {
	db, err := database.NewTestDB()
	if err != nil {
		t.Fatalf("failed to create test db: %v", err)
	}
	_ = db.AutoMigrate(&entity.Product{})

	// Seed product with initial stock 10
	prod := entity.Product{
		ID:    "prod-stock-test-1",
		Name:  "Wireless Gaming Mouse",
		Price: 350000,
		Stock: 10,
	}
	if err := db.Create(&prod).Error; err != nil {
		t.Fatalf("failed to seed product: %v", err)
	}

	payload := map[string]interface{}{
		"event_id":   "evt-stock-1",
		"event_type": "payment.completed",
		"data": map[string]interface{}{
			"order_id":   "ord-stock-1",
			"payment_id": "pay-stock-1",
			"items": []map[string]interface{}{
				{
					"product_id": "prod-stock-test-1",
					"quantity":   3,
				},
			},
		},
	}
	body, _ := json.Marshal(payload)

	if err := event.ProcessStockDeductionPayload(body, db); err != nil {
		t.Fatalf("failed to process stock deduction payload: %v", err)
	}

	var updated entity.Product
	if err := db.First(&updated, "id = ?", "prod-stock-test-1").Error; err != nil {
		t.Fatalf("failed to query updated product: %v", err)
	}

	// 10 - 3 = 7
	if updated.Stock != 7 {
		t.Fatalf("expected stock 7, got %d", updated.Stock)
	}
}
