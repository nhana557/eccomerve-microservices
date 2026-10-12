package handler

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"ecommerce-platform/packages/shared-go/response"
	"ecommerce-platform/services/auth-service/internal/infrastructure/entity"
	"ecommerce-platform/services/auth-service/internal/infrastructure/repository"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	repo      repository.UserRepository
	jwtSecret string
}

func NewAuthHandler(repo repository.UserRepository, jwtSecret string) *AuthHandler {
	return &AuthHandler{
		repo:      repo,
		jwtSecret: jwtSecret,
	}
}

type RegisterRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type UserClaims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

func (h *AuthHandler) generateToken(user *entity.User) (string, error) {
	claims := UserClaims{
		UserID: user.ID,
		Email:  user.Email,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(h.jwtSecret))
}

func (h *AuthHandler) setTokenCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     "token",
		Value:    token,
		Path:     "/",
		MaxAge:   86400,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   false,
	})
}

func (h *AuthHandler) clearTokenCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     "token",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   false,
	})
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		response.Error(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method tidak diizinkan", "auth-service")
		return
	}

	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_PAYLOAD", "Payload JSON tidak valid", "auth-service")
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.Name = strings.TrimSpace(req.Name)
	if req.Email == "" || req.Name == "" || len(req.Password) < 6 {
		response.Error(w, http.StatusBadRequest, "VALIDATION_FAILED", "Nama, email valid, dan password min 6 karakter wajib diisi", "auth-service")
		return
	}

	existing, _ := h.repo.GetByEmail(r.Context(), req.Email)
	if existing != nil {
		response.Error(w, http.StatusConflict, "USER_EXISTS", "Email sudah terdaftar", "auth-service")
		return
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Gagal enkripsi password", "auth-service")
		return
	}

	user := entity.User{
		ID:           uuid.New().String(),
		Name:         req.Name,
		Email:        req.Email,
		PasswordHash: string(hashed),
		Role:         "customer",
	}

	if err := h.repo.Create(r.Context(), &user); err != nil {
		response.Error(w, http.StatusInternalServerError, "DB_ERROR", "Gagal menyimpan user ke database", "auth-service")
		return
	}

	token, _ := h.generateToken(&user)
	h.setTokenCookie(w, token)

	response.JSON(w, http.StatusCreated, map[string]interface{}{
		"user": map[string]interface{}{
			"id":    user.ID,
			"name":  user.Name,
			"email": user.Email,
			"role":  user.Role,
		},
	}, "auth-service")
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		response.Error(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method tidak diizinkan", "auth-service")
		return
	}

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_PAYLOAD", "Payload JSON tidak valid", "auth-service")
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	user, err := h.repo.GetByEmail(r.Context(), req.Email)
	if err != nil || user == nil {
		response.Error(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "Email atau password salah", "auth-service")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		response.Error(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "Email atau password salah", "auth-service")
		return
	}

	token, _ := h.generateToken(user)
	h.setTokenCookie(w, token)

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"user": map[string]interface{}{
			"id":    user.ID,
			"name":  user.Name,
			"email": user.Email,
			"role":  user.Role,
		},
	}, "auth-service")
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	h.clearTokenCookie(w)
	response.JSON(w, http.StatusOK, map[string]string{
		"message": "Logout berhasil",
	}, "auth-service")
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	tokenStr := ""
	if cookie, err := r.Cookie("token"); err == nil {
		tokenStr = cookie.Value
	} else {
		authHeader := r.Header.Get("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			tokenStr = strings.TrimPrefix(authHeader, "Bearer ")
		}
	}

	if tokenStr == "" {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Tidak ada sesi aktif", "auth-service")
		return
	}

	claims := &UserClaims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
		return []byte(h.jwtSecret), nil
	})
	if err != nil || !token.Valid {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Token tidak valid atau telah kedaluwarsa", "auth-service")
		return
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"user": map[string]interface{}{
			"id":    claims.UserID,
			"email": claims.Email,
			"role":  claims.Role,
		},
	}, "auth-service")
}

type SyncUserRequest struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	Role      string `json:"role"`
	AvatarURL string `json:"avatar_url"`
}

func (h *AuthHandler) SyncUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		response.Error(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method tidak diizinkan", "auth-service")
		return
	}

	var req SyncUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_PAYLOAD", "Payload JSON tidak valid", "auth-service")
		return
	}

	headerUserID := r.Header.Get("X-User-Id")
	if req.ID == "" && headerUserID != "" {
		req.ID = headerUserID
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	if strings.TrimSpace(req.ID) == "" || req.Email == "" {
		response.Error(w, http.StatusBadRequest, "VALIDATION_FAILED", "ID dan email wajib diisi untuk sinkronisasi", "auth-service")
		return
	}

	role := "customer"
	if req.Role != "" {
		role = req.Role
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		name = "Pengguna"
	}

	user := entity.User{
		ID:           req.ID,
		Name:         name,
		Email:        req.Email,
		Role:         role,
		AvatarURL:    req.AvatarURL,
		PasswordHash: "CLERK_MANAGED_ACCOUNT",
	}

	if err := h.repo.Upsert(r.Context(), &user); err != nil {
		response.Error(w, http.StatusInternalServerError, "DATABASE_ERROR", err.Error(), "auth-service")
		return
	}

	response.JSON(w, http.StatusOK, user, "auth-service")
}

type ClerkWebhookPayload struct {
	Type string `json:"type"`
	Data struct {
		ID                    string `json:"id"`
		FirstName             string `json:"first_name"`
		LastName              string `json:"last_name"`
		ImageURL              string `json:"image_url"`
		PrimaryEmailAddressID string `json:"primary_email_address_id"`
		EmailAddresses        []struct {
			ID           string `json:"id"`
			EmailAddress string `json:"email_address"`
		} `json:"email_addresses"`
	} `json:"data"`
}

func (h *AuthHandler) ClerkWebhook(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		response.Error(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method tidak diizinkan", "auth-service")
		return
	}

	var payload ClerkWebhookPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_PAYLOAD", "Payload webhook JSON tidak valid", "auth-service")
		return
	}

	userId := payload.Data.ID
	if userId == "" {
		response.JSON(w, http.StatusOK, map[string]string{"status": "ignored_no_id"}, "auth-service")
		return
	}

	email := ""
	for _, em := range payload.Data.EmailAddresses {
		if em.ID == payload.Data.PrimaryEmailAddressID {
			email = em.EmailAddress
			break
		}
	}
	if email == "" && len(payload.Data.EmailAddresses) > 0 {
		email = payload.Data.EmailAddresses[0].EmailAddress
	}

	fullName := strings.TrimSpace(payload.Data.FirstName + " " + payload.Data.LastName)
	if fullName == "" {
		fullName = "Google User"
	}

	switch payload.Type {
	case "user.created", "user.updated":
		user := entity.User{
			ID:           userId,
			Name:         fullName,
			Email:        email,
			Role:         "customer",
			AvatarURL:    payload.Data.ImageURL,
			PasswordHash: "CLERK_MANAGED_ACCOUNT",
		}
		_ = h.repo.Upsert(r.Context(), &user)

	case "user.deleted":
		_ = h.repo.Delete(r.Context(), userId)
	}

	response.JSON(w, http.StatusOK, map[string]string{"status": "processed"}, "auth-service")
}
