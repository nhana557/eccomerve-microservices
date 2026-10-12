package middleware_test

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"ecommerce-platform/services/api-gateway/internal/middleware"
	"github.com/golang-jwt/jwt/v5"
)

func TestAuthMiddlewareExtractsCookieAndInjectsHeaders(t *testing.T) {
	jwtSecret := "gateway-secret-12345"
	claims := jwt.MapClaims{
		"user_id": "usr-test-123",
		"email":   "test@tokopedia.local",
		"role":    "customer",
		"exp":     time.Now().Add(time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, _ := token.SignedString([]byte(jwtSecret))

	var capturedUserId, capturedEmail, capturedRole string
	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedUserId = r.Header.Get("X-User-Id")
		capturedEmail = r.Header.Get("X-User-Email")
		capturedRole = r.Header.Get("X-User-Role")
		w.WriteHeader(http.StatusOK)
	})

	mw := middleware.Auth(jwtSecret)(nextHandler)

	// Case 1: Token in HttpOnly cookie
	reqCookie := httptest.NewRequest(http.MethodGet, "/api/v1/orders", nil)
	reqCookie.AddCookie(&http.Cookie{Name: "token", Value: tokenStr})
	recCookie := httptest.NewRecorder()

	mw.ServeHTTP(recCookie, reqCookie)

	if recCookie.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recCookie.Code)
	}
	if capturedUserId != "usr-test-123" || capturedEmail != "test@tokopedia.local" || capturedRole != "customer" {
		t.Fatalf("headers from cookie not injected properly: id=%s email=%s role=%s", capturedUserId, capturedEmail, capturedRole)
	}

	// Reset captures
	capturedUserId, capturedEmail, capturedRole = "", "", ""

	// Case 2: Token in Authorization: Bearer header
	reqBearer := httptest.NewRequest(http.MethodGet, "/api/v1/orders", nil)
	reqBearer.Header.Set("Authorization", "Bearer "+tokenStr)
	recBearer := httptest.NewRecorder()

	mw.ServeHTTP(recBearer, reqBearer)

	if capturedUserId != "usr-test-123" {
		t.Fatalf("headers from Bearer not injected properly: id=%s", capturedUserId)
	}

	// Reset captures
	capturedUserId, capturedEmail, capturedRole = "", "", ""

	// Case 3: Public request without token proceeds without headers
	reqPublic := httptest.NewRequest(http.MethodGet, "/api/v1/products", nil)
	recPublic := httptest.NewRecorder()

	mw.ServeHTTP(recPublic, reqPublic)
	if capturedUserId != "" {
		t.Fatalf("expected empty X-User-Id for public request, got %s", capturedUserId)
	}
}

func TestAuthMiddlewareVerifiesClerkRS256Token(t *testing.T) {
	reader := rand.Reader
	bitSize := 2048
	rsaKey, err := rsa.GenerateKey(reader, bitSize)
	if err != nil {
		t.Fatalf("failed to generate RSA key: %v", err)
	}

	pubASN1, err := x509.MarshalPKIXPublicKey(&rsaKey.PublicKey)
	if err != nil {
		t.Fatalf("failed to marshal public key: %v", err)
	}
	pubPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "PUBLIC KEY",
		Bytes: pubASN1,
	})

	claims := jwt.MapClaims{
		"sub":   "user_2clerk_test_99",
		"email": "clerk_user@gmail.com",
		"role":  "customer",
		"exp":   time.Now().Add(time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	tokenStr, err := token.SignedString(rsaKey)
	if err != nil {
		t.Fatalf("failed to sign RS256 token: %v", err)
	}

	var capturedUserId, capturedEmail, capturedRole string
	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedUserId = r.Header.Get("X-User-Id")
		capturedEmail = r.Header.Get("X-User-Email")
		capturedRole = r.Header.Get("X-User-Role")
		w.WriteHeader(http.StatusOK)
	})

	mw := middleware.DualEngineAuth("fallback-secret", string(pubPEM))(nextHandler)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/orders", nil)
	req.Header.Set("Authorization", "Bearer "+tokenStr)
	rec := httptest.NewRecorder()

	mw.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if capturedUserId != "user_2clerk_test_99" || capturedEmail != "clerk_user@gmail.com" || capturedRole != "customer" {
		t.Fatalf("RS256 headers not injected properly: id=%s email=%s role=%s", capturedUserId, capturedEmail, capturedRole)
	}
}
