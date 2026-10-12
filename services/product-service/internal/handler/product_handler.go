package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"ecommerce-platform/packages/shared-go/response"
	"ecommerce-platform/services/product-service/internal/infrastructure/elasticsearch"
	"ecommerce-platform/services/product-service/internal/infrastructure/entity"
	"ecommerce-platform/services/product-service/internal/infrastructure/repository"
	"gorm.io/gorm"
)

type ProductHandler struct {
	repo     repository.ProductRepository
	esClient elasticsearch.Client
}

func NewProductHandler(repo repository.ProductRepository) *ProductHandler {
	return &ProductHandler{repo: repo}
}

func NewProductHandlerWithES(repo repository.ProductRepository, esClient elasticsearch.Client) *ProductHandler {
	return &ProductHandler{repo: repo, esClient: esClient}
}

type CreateProductRequest struct {
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Price       int64   `json:"price"`
	Stock       int     `json:"stock"`
	Category    string  `json:"category"`
	CategoryID  *string `json:"category_id"`
	ImageURL    string  `json:"image_url"`
}

type UpdateProductRequest struct {
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Price       int64   `json:"price"`
	Stock       int     `json:"stock"`
	Category    string  `json:"category"`
	CategoryID  *string `json:"category_id"`
	ImageURL    string  `json:"image_url"`
}

func (h *ProductHandler) CreateProduct(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		response.Error(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "product-service")
		return
	}

	var req CreateProductRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_PAYLOAD", "Invalid request body", "product-service")
		return
	}

	if strings.TrimSpace(req.Name) == "" {
		response.Error(w, http.StatusBadRequest, "VALIDATION_FAILED", "Product name is required", "product-service")
		return
	}

	product := entity.Product{
		Name:        req.Name,
		Description: req.Description,
		Price:       req.Price,
		Stock:       req.Stock,
		Category:    req.Category,
		CategoryID:  req.CategoryID,
		ImageURL:    req.ImageURL,
	}

	if err := h.repo.Create(r.Context(), &product); err != nil {
		response.Error(w, http.StatusInternalServerError, "DATABASE_ERROR", err.Error(), "product-service")
		return
	}

	response.JSON(w, http.StatusCreated, product, "product-service")
}

func (h *ProductHandler) GetProductByID(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		if len(parts) >= 4 {
			id = parts[3]
		}
	}

	if id == "" {
		response.Error(w, http.StatusBadRequest, "MISSING_ID", "Product ID is required", "product-service")
		return
	}

	product, err := h.repo.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "Product not found", "product-service")
			return
		}
		response.Error(w, http.StatusInternalServerError, "DATABASE_ERROR", err.Error(), "product-service")
		return
	}

	response.JSON(w, http.StatusOK, product, "product-service")
}

func (h *ProductHandler) ListProducts(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	search := r.URL.Query().Get("q")
	if search == "" {
		search = r.URL.Query().Get("search")
	}

	minPrice, _ := strconv.ParseInt(r.URL.Query().Get("min_price"), 10, 64)
	maxPrice, _ := strconv.ParseInt(r.URL.Query().Get("max_price"), 10, 64)
	minStock, _ := strconv.Atoi(r.URL.Query().Get("min_stock"))

	noCacheParam := r.URL.Query().Get("no_cache")
	noCache := noCacheParam == "true" || noCacheParam == "1" ||
		r.URL.Query().Get("direct") == "true" ||
		r.Header.Get("X-No-Cache") == "true" ||
		strings.Contains(r.Header.Get("Cache-Control"), "no-cache") ||
		strings.HasSuffix(r.URL.Path, "/direct")

	method := r.URL.Query().Get("method")
	if method == "" {
		method = "btree_index"
	}
	if noCache && (method == "hybrid_fast" || method == "fastest") {
		method = "btree_index"
	}

	filter := repository.ProductFilter{
		CategoryID: r.URL.Query().Get("category_id"),
		Category:   r.URL.Query().Get("category"),
		Search:     search,
		Sort:       r.URL.Query().Get("sort"),
		MinPrice:   minPrice,
		MaxPrice:   maxPrice,
		MinStock:   minStock,
		Limit:      limit,
		Offset:     offset,
		Method:     method,
		NoCache:    noCache,
	}

	products, total, err := h.repo.ListWithFilter(r.Context(), filter)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "DATABASE_ERROR", err.Error(), "product-service")
		return
	}

	if limit <= 0 {
		limit = 20
	}

	if noCache {
		w.Header().Set("X-Cache", "BYPASS")
		w.Header().Set("X-Cache-Tier", "NONE")
		w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	} else {
		w.Header().Set("X-Cache-Tier", "T3")
	}

	isCached := !noCache && (method == "cqrs" || method == "in_memory_cache" || method == "cache" || method == "hybrid_fast" || method == "fastest")
	cacheTier := "NONE"
	if isCached {
		cacheTier = "T3"
	} else if !noCache {
		cacheTier = "T3"
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"products":   products,
		"total":      total,
		"limit":      limit,
		"offset":     offset,
		"method":     method,
		"cached":     isCached,
		"cache_tier": cacheTier,
	}, "product-service")
}

func (h *ProductHandler) ListProductsDirect(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	q.Set("no_cache", "true")
	r.URL.RawQuery = q.Encode()
	h.ListProducts(w, r)
}

func (h *ProductHandler) UpdateProduct(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		if len(parts) >= 4 {
			id = parts[3]
		}
	}

	product, err := h.repo.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "Product not found", "product-service")
			return
		}
		response.Error(w, http.StatusInternalServerError, "DATABASE_ERROR", err.Error(), "product-service")
		return
	}

	var req UpdateProductRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_PAYLOAD", "Invalid request body", "product-service")
		return
	}

	if req.Name != "" {
		product.Name = req.Name
	}
	if req.Description != "" {
		product.Description = req.Description
	}
	if req.Price != 0 {
		product.Price = req.Price
	}
	if req.Stock >= 0 {
		product.Stock = req.Stock
	}
	if req.Category != "" {
		product.Category = req.Category
	}
	if req.CategoryID != nil {
		product.CategoryID = req.CategoryID
	}
	if req.ImageURL != "" {
		product.ImageURL = req.ImageURL
	}

	if err := h.repo.Update(r.Context(), product); err != nil {
		response.Error(w, http.StatusInternalServerError, "DATABASE_ERROR", err.Error(), "product-service")
		return
	}

	response.JSON(w, http.StatusOK, product, "product-service")
}

func (h *ProductHandler) DeleteProduct(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		if len(parts) >= 4 {
			id = parts[3]
		}
	}

	if err := h.repo.Delete(r.Context(), id); err != nil {
		response.Error(w, http.StatusInternalServerError, "DATABASE_ERROR", err.Error(), "product-service")
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"message": "Product deleted successfully"}, "product-service")
}

// SyncElasticsearch synchronizes a batch of products from the PostgreSQL database into Elasticsearch.
func (h *ProductHandler) SyncElasticsearch(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		response.Error(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "product-service")
		return
	}

	if h.esClient == nil {
		response.Error(w, http.StatusServiceUnavailable, "ES_UNAVAILABLE", "Elasticsearch client is not configured", "product-service")
		return
	}

	limitStr := r.URL.Query().Get("limit")
	limit := 1000
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}
	if limit > 50000 {
		limit = 50000
	}

	offset := 0
	if offsetStr := r.URL.Query().Get("offset"); offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
			offset = o
		}
	}

	// 1. Read batch from database
	products, total, err := h.repo.ListWithFilter(r.Context(), repository.ProductFilter{
		Limit:   limit,
		Offset:  offset,
		NoCache: true,
	})
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "DATABASE_ERROR", err.Error(), "product-service")
		return
	}

	// 2. Ensure index exists
	_ = h.esClient.EnsureIndex(r.Context())

	// 3. Bulk index into Elasticsearch
	synced, err := h.esClient.BulkIndexProducts(r.Context(), products)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "SYNC_FAILED", err.Error(), "product-service")
		return
	}

	response.JSON(w, http.StatusOK, map[string]any{
		"message":  "Elasticsearch CQRS synchronization completed successfully",
		"synced":   synced,
		"limit":    limit,
		"offset":   offset,
		"total_db": total,
	}, "product-service")
}

// PurgeCache invalidates backend CQRS read-model, memory caches, and category count cache.
func (h *ProductHandler) PurgeCache(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost && r.Method != http.MethodDelete {
		response.Error(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "product-service")
		return
	}

	h.repo.InvalidateCache()
	response.JSON(w, http.StatusOK, map[string]any{
		"tier":    "T3",
		"message": "Tier 3 CQRS and in-memory cache purged successfully",
	}, "product-service")
}
