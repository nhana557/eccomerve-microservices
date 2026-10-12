package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"ecommerce-platform/packages/shared-go/response"
	"ecommerce-platform/services/auth-service/internal/infrastructure/entity"
	"ecommerce-platform/services/auth-service/internal/infrastructure/repository"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type UserHandler struct {
	repo repository.UserRepository
}

func NewUserHandler(repo repository.UserRepository) *UserHandler {
	return &UserHandler{repo: repo}
}

type CreateUserRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

type UpdateUserRequest struct {
	Name string `json:"name"`
	Role string `json:"role"`
}

func (h *UserHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		response.Error(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "auth-service")
		return
	}

	var req CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_PAYLOAD", "Invalid request body", "auth-service")
		return
	}

	if strings.TrimSpace(req.Email) == "" || strings.TrimSpace(req.Password) == "" || strings.TrimSpace(req.Name) == "" {
		response.Error(w, http.StatusBadRequest, "VALIDATION_FAILED", "Name, email, and password are required", "auth-service")
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to hash password", "auth-service")
		return
	}

	role := "customer"
	if req.Role != "" {
		role = req.Role
	}

	user := entity.User{
		Name:         req.Name,
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		Role:         role,
	}

	if err := h.repo.Create(r.Context(), &user); err != nil {
		response.Error(w, http.StatusInternalServerError, "DATABASE_ERROR", err.Error(), "auth-service")
		return
	}

	response.JSON(w, http.StatusCreated, user, "auth-service")
}

func (h *UserHandler) GetUserByID(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		if len(parts) >= 4 {
			id = parts[3]
		}
	}

	if id == "" {
		response.Error(w, http.StatusBadRequest, "MISSING_ID", "User ID is required", "auth-service")
		return
	}

	user, err := h.repo.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "User not found", "auth-service")
			return
		}
		response.Error(w, http.StatusInternalServerError, "DATABASE_ERROR", err.Error(), "auth-service")
		return
	}

	response.JSON(w, http.StatusOK, user, "auth-service")
}

func (h *UserHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	users, total, err := h.repo.List(r.Context(), limit, offset)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "DATABASE_ERROR", err.Error(), "auth-service")
		return
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"users": users,
		"total": total,
	}, "auth-service")
}

func (h *UserHandler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		if len(parts) >= 4 {
			id = parts[3]
		}
	}

	user, err := h.repo.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "User not found", "auth-service")
			return
		}
		response.Error(w, http.StatusInternalServerError, "DATABASE_ERROR", err.Error(), "auth-service")
		return
	}

	var req UpdateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_PAYLOAD", "Invalid request body", "auth-service")
		return
	}

	if req.Name != "" {
		user.Name = req.Name
	}
	if req.Role != "" {
		user.Role = req.Role
	}

	if err := h.repo.Update(r.Context(), user); err != nil {
		response.Error(w, http.StatusInternalServerError, "DATABASE_ERROR", err.Error(), "auth-service")
		return
	}

	response.JSON(w, http.StatusOK, user, "auth-service")
}

func (h *UserHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		if len(parts) >= 4 {
			id = parts[3]
		}
	}

	if err := h.repo.Delete(r.Context(), id); err != nil {
		response.Error(w, http.StatusInternalServerError, "DATABASE_ERROR", err.Error(), "auth-service")
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"message": "User deleted successfully"}, "auth-service")
}
