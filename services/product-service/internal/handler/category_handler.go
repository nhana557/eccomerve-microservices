package handler

import (
	"errors"
	"net/http"
	"strings"

	"ecommerce-platform/packages/shared-go/response"
	"ecommerce-platform/services/product-service/internal/infrastructure/repository"
	"gorm.io/gorm"
)

type CategoryHandler struct {
	repo repository.CategoryRepository
}

func NewCategoryHandler(repo repository.CategoryRepository) *CategoryHandler {
	return &CategoryHandler{repo: repo}
}

func (h *CategoryHandler) ListCategories(w http.ResponseWriter, r *http.Request) {
	categories, err := h.repo.ListHierarchy(r.Context())
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "DATABASE_ERROR", err.Error(), "product-service")
		return
	}
	response.JSON(w, http.StatusOK, categories, "product-service")
}

func (h *CategoryHandler) GetCategoryByID(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		if len(parts) >= 4 {
			id = parts[3]
		}
	}

	if id == "" {
		response.Error(w, http.StatusBadRequest, "MISSING_ID", "Category ID is required", "product-service")
		return
	}

	category, err := h.repo.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "Category not found", "product-service")
			return
		}
		response.Error(w, http.StatusInternalServerError, "DATABASE_ERROR", err.Error(), "product-service")
		return
	}

	response.JSON(w, http.StatusOK, category, "product-service")
}
