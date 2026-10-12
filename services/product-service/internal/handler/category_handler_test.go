package handler_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"ecommerce-platform/packages/shared-go/database"
	"ecommerce-platform/services/product-service/internal/handler"
	"ecommerce-platform/services/product-service/internal/infrastructure/entity"
	"ecommerce-platform/services/product-service/internal/infrastructure/repository"
)

func TestCategoryHandler_ListCategories(t *testing.T) {
	db, err := database.NewTestDB()
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	_ = db.AutoMigrate(&entity.Category{})
	repo := repository.NewGormCategoryRepository(db)

	cat := entity.Category{ID: "c1", Name: "Elektronik", Slug: "elektronik", Level: 1}
	_ = repo.Create(t.Context(), &cat)

	h := handler.NewCategoryHandler(repo)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/categories", nil)
	w := httptest.NewRecorder()

	h.ListCategories(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var res struct {
		Success bool              `json:"success"`
		Data    []entity.Category `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &res); err != nil {
		t.Fatalf("failed to parse json response: %v", err)
	}

	if len(res.Data) != 1 || res.Data[0].Name != "Elektronik" {
		t.Errorf("unexpected category response: %+v", res.Data)
	}
}
