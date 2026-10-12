package handler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"ecommerce-platform/packages/shared-go/database"
	"ecommerce-platform/services/product-service/internal/handler"
	"ecommerce-platform/services/product-service/internal/infrastructure/entity"
	"ecommerce-platform/services/product-service/internal/infrastructure/repository"
)

func setupTestProductEnv(t *testing.T) *handler.ProductHandler {
	db, err := database.NewTestDB()
	if err != nil {
		t.Fatalf("failed to create test db: %v", err)
	}
	if err := db.AutoMigrate(&entity.Product{}); err != nil {
		t.Fatalf("failed to auto migrate: %v", err)
	}
	repo := repository.NewGormProductRepository(db)
	return handler.NewProductHandler(repo)
}

func TestCreateAndGetProduct(t *testing.T) {
	h := setupTestProductEnv(t)

	payload := map[string]interface{}{
		"name":        "Mechanical Keyboard",
		"description": "RGB Wireless 75%",
		"price":       1250000,
		"stock":       20,
		"category":    "Electronics",
	}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/products", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	h.CreateProduct(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d. body: %s", w.Code, w.Body.String())
	}

	var res struct {
		Success bool           `json:"success"`
		Data    entity.Product `json:"data"`
	}
	_ = json.Unmarshal(w.Body.Bytes(), &res)
	if res.Data.ID == "" || res.Data.Name != "Mechanical Keyboard" {
		t.Fatalf("unexpected product data: %+v", res.Data)
	}
}

func TestProductHandler_ListProducts_Filter(t *testing.T) {
	h := setupTestProductEnv(t)

	// Create 2 products
	catID := "cat-elec"
	p1 := map[string]interface{}{
		"name":        "Keyboard RGB",
		"price":       1000000,
		"stock":       10,
		"category":    "Electronics",
		"category_id": catID,
	}
	body1, _ := json.Marshal(p1)
	req1 := httptest.NewRequest(http.MethodPost, "/api/v1/products", bytes.NewReader(body1))
	req1.Header.Set("Content-Type", "application/json")
	w1 := httptest.NewRecorder()
	h.CreateProduct(w1, req1)

	p2 := map[string]interface{}{
		"name":     "Sepatu Sneaker",
		"price":    500000,
		"stock":    5,
		"category": "Fashion",
	}
	body2, _ := json.Marshal(p2)
	req2 := httptest.NewRequest(http.MethodPost, "/api/v1/products", bytes.NewReader(body2))
	req2.Header.Set("Content-Type", "application/json")
	w2 := httptest.NewRecorder()
	h.CreateProduct(w2, req2)

	// Filter by category_id
	req := httptest.NewRequest(http.MethodGet, "/api/v1/products?category_id=cat-elec", nil)
	w := httptest.NewRecorder()
	h.ListProducts(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var res struct {
		Data struct {
			Products []entity.Product `json:"products"`
			Total    int64            `json:"total"`
		} `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &res); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if res.Data.Total != 1 || len(res.Data.Products) != 1 {
		t.Fatalf("expected 1 product for category_id, got %d (total: %d)", len(res.Data.Products), res.Data.Total)
	}
	if res.Data.Products[0].Name != "Keyboard RGB" {
		t.Errorf("expected Keyboard RGB, got %s", res.Data.Products[0].Name)
	}

	// Test with method=cqrs and method=postgres_filter
	reqCqrs := httptest.NewRequest(http.MethodGet, "/api/v1/products?method=cqrs", nil)
	wCqrs := httptest.NewRecorder()
	h.ListProducts(wCqrs, reqCqrs)
	if wCqrs.Code != http.StatusOK {
		t.Fatalf("expected 200 for cqrs method, got %d", wCqrs.Code)
	}

	reqPg := httptest.NewRequest(http.MethodGet, "/api/v1/products?method=postgres_filter", nil)
	wPg := httptest.NewRecorder()
	h.ListProducts(wPg, reqPg)
	if wPg.Code != http.StatusOK {
		t.Fatalf("expected 200 for postgres_filter method, got %d", wPg.Code)
	}
}

func TestProductHandler_ListProducts_DirectNoCache(t *testing.T) {
	h := setupTestProductEnv(t)

	// Direct endpoint /api/v1/products/direct
	reqDirect := httptest.NewRequest(http.MethodGet, "/api/v1/products/direct", nil)
	wDirect := httptest.NewRecorder()
	h.ListProductsDirect(wDirect, reqDirect)

	if wDirect.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", wDirect.Code)
	}

	if wDirect.Header().Get("X-Cache") != "BYPASS" {
		t.Errorf("expected X-Cache header BYPASS, got %s", wDirect.Header().Get("X-Cache"))
	}
	if wDirect.Header().Get("X-Cache-Tier") != "NONE" {
		t.Errorf("expected X-Cache-Tier header NONE, got %s", wDirect.Header().Get("X-Cache-Tier"))
	}
	if wDirect.Header().Get("Cache-Control") != "no-cache, no-store, must-revalidate" {
		t.Errorf("expected no-cache Cache-Control, got %s", wDirect.Header().Get("Cache-Control"))
	}

	var res struct {
		Data struct {
			Cached    bool   `json:"cached"`
			CacheTier string `json:"cache_tier"`
		} `json:"data"`
	}
	if err := json.Unmarshal(wDirect.Body.Bytes(), &res); err != nil {
		t.Fatalf("failed to decode json: %v", err)
	}
	if res.Data.Cached {
		t.Errorf("expected cached to be false, got true")
	}
	if res.Data.CacheTier != "NONE" {
		t.Errorf("expected cache_tier NONE, got %s", res.Data.CacheTier)
	}
}

type mockESForHandler struct {
	bulkCalled bool
}

func (m *mockESForHandler) Ping(ctx context.Context) error                            { return nil }
func (m *mockESForHandler) EnsureIndex(ctx context.Context) error                     { return nil }
func (m *mockESForHandler) IndexProduct(ctx context.Context, p *entity.Product) error { return nil }
func (m *mockESForHandler) DeleteProduct(ctx context.Context, id string) error        { return nil }
func (m *mockESForHandler) BulkIndexProducts(ctx context.Context, products []entity.Product) (int, error) {
	m.bulkCalled = true
	return len(products), nil
}
func (m *mockESForHandler) SearchProducts(ctx context.Context, filter repository.SearchFilter) ([]entity.Product, int64, error) {
	return nil, 0, nil
}
func (m *mockESForHandler) IsHealthy() bool { return true }

func TestProductHandler_SyncElasticsearch(t *testing.T) {
	db, err := database.NewTestDB()
	if err != nil {
		t.Fatalf("failed to create test db: %v", err)
	}
	if err := db.AutoMigrate(&entity.Product{}); err != nil {
		t.Fatalf("failed to auto migrate: %v", err)
	}
	repo := repository.NewGormProductRepository(db)
	mockES := &mockESForHandler{}
	h := handler.NewProductHandlerWithES(repo, mockES)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/products/sync-es?limit=10", nil)
	w := httptest.NewRecorder()
	h.SyncElasticsearch(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d. body: %s", w.Code, w.Body.String())
	}
	if !mockES.bulkCalled {
		t.Errorf("expected BulkIndexProducts to be called")
	}
}

func TestProductHandler_PurgeCache(t *testing.T) {
	h := setupTestProductEnv(t)

	// Valid POST to /api/v1/products/cache/purge
	req := httptest.NewRequest(http.MethodPost, "/api/v1/products/cache/purge", nil)
	w := httptest.NewRecorder()
	h.PurgeCache(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d. body: %s", w.Code, w.Body.String())
	}

	var res struct {
		Success bool `json:"success"`
		Data    struct {
			Tier    string `json:"tier"`
			Message string `json:"message"`
		} `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &res); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if !res.Success || res.Data.Tier != "T3" {
		t.Errorf("expected success=true and tier=T3, got: %+v", res)
	}

	// Invalid GET method
	reqGet := httptest.NewRequest(http.MethodGet, "/api/v1/products/cache/purge", nil)
	wGet := httptest.NewRecorder()
	h.PurgeCache(wGet, reqGet)
	if wGet.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405 for GET, got %d", wGet.Code)
	}
}
