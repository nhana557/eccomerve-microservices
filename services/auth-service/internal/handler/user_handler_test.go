package handler_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"ecommerce-platform/packages/shared-go/database"
	"ecommerce-platform/services/auth-service/internal/handler"
	"ecommerce-platform/services/auth-service/internal/infrastructure/entity"
	"ecommerce-platform/services/auth-service/internal/infrastructure/repository"
)

func setupTestUserEnv(t *testing.T) *handler.UserHandler {
	db, err := database.NewTestDB()
	if err != nil {
		t.Fatalf("failed to create test db: %v", err)
	}
	if err := db.AutoMigrate(&entity.User{}); err != nil {
		t.Fatalf("failed to auto migrate: %v", err)
	}
	repo := repository.NewGormUserRepository(db)
	return handler.NewUserHandler(repo)
}

func TestCreateAndGetUser(t *testing.T) {
	h := setupTestUserEnv(t)

	// 1. Create User
	payload := map[string]string{
		"name":     "John Doe",
		"email":    "john@example.com",
		"password": "secretpassword",
		"role":     "customer",
	}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/users", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	h.CreateUser(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d. body: %s", w.Code, w.Body.String())
	}

	var res struct {
		Success bool        `json:"success"`
		Data    entity.User `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &res); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if res.Data.ID == "" || res.Data.Email != "john@example.com" {
		t.Fatalf("unexpected user data: %+v", res.Data)
	}
	if res.Data.PasswordHash != "" {
		t.Fatal("expected password_hash to be omitted from JSON response")
	}

	// 2. Get User by ID
	getReq := httptest.NewRequest(http.MethodGet, "/api/v1/users?id="+res.Data.ID, nil)
	getW := httptest.NewRecorder()
	h.GetUserByID(getW, getReq)
	if getW.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", getW.Code)
	}
}
