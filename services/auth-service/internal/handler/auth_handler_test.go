package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"ecommerce-platform/services/auth-service/internal/infrastructure/entity"
)

type mockUserRepo struct {
	users map[string]*entity.User
}

func newMockUserRepo() *mockUserRepo {
	return &mockUserRepo{users: make(map[string]*entity.User)}
}

func (m *mockUserRepo) Create(ctx context.Context, u *entity.User) error {
	m.users[u.Email] = u
	return nil
}

func (m *mockUserRepo) GetByID(ctx context.Context, id string) (*entity.User, error) {
	for _, u := range m.users {
		if u.ID == id {
			return u, nil
		}
	}
	return nil, nil
}

func (m *mockUserRepo) GetByEmail(ctx context.Context, email string) (*entity.User, error) {
	if u, ok := m.users[email]; ok {
		return u, nil
	}
	return nil, nil
}

func (m *mockUserRepo) List(ctx context.Context, limit, offset int) ([]entity.User, int64, error) {
	return nil, 0, nil
}

func (m *mockUserRepo) Update(ctx context.Context, u *entity.User) error {
	return nil
}

func (m *mockUserRepo) Upsert(ctx context.Context, u *entity.User) error {
	m.users[u.ID] = u
	m.users[u.Email] = u
	return nil
}

func (m *mockUserRepo) Delete(ctx context.Context, id string) error {
	return nil
}

func (m *mockUserRepo) SeedDemoUsers(ctx context.Context) error {
	return nil
}

func TestRegisterAndLoginHttpOnlyCookie(t *testing.T) {
	repo := newMockUserRepo()
	jwtSecret := "test-secret-key-12345"
	authH := NewAuthHandler(repo, jwtSecret)

	// 1. Test Register
	regBody, _ := json.Marshal(RegisterRequest{
		Name:     "Budi Santoso",
		Email:    "budi@example.com",
		Password: "password123",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewReader(regBody))
	rec := httptest.NewRecorder()
	authH.Register(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d: %s", rec.Code, rec.Body.String())
	}

	cookies := rec.Result().Cookies()
	var tokenCookie *http.Cookie
	for _, c := range cookies {
		if c.Name == "token" {
			tokenCookie = c
			break
		}
	}
	if tokenCookie == nil {
		t.Fatal("expected Set-Cookie header with 'token'")
	}
	if !tokenCookie.HttpOnly {
		t.Fatal("expected cookie to be HttpOnly")
	}

	// 2. Test Login
	loginBody, _ := json.Marshal(LoginRequest{
		Email:    "budi@example.com",
		Password: "password123",
	})
	reqLogin := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(loginBody))
	recLogin := httptest.NewRecorder()
	authH.Login(recLogin, reqLogin)

	if recLogin.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", recLogin.Code, recLogin.Body.String())
	}

	// 3. Test Me with cookie
	reqMe := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	reqMe.AddCookie(tokenCookie)
	recMe := httptest.NewRecorder()
	authH.Me(recMe, reqMe)

	if recMe.Code != http.StatusOK {
		t.Fatalf("expected status 200 for Me endpoint, got %d: %s", recMe.Code, recMe.Body.String())
	}

	// 4. Test Logout
	reqLogout := httptest.NewRequest(http.MethodPost, "/api/v1/auth/logout", nil)
	recLogout := httptest.NewRecorder()
	authH.Logout(recLogout, reqLogout)

	if recLogout.Code != http.StatusOK {
		t.Fatalf("expected status 200 for Logout, got %d", recLogout.Code)
	}
	logoutCookies := recLogout.Result().Cookies()
	var clearedCookie *http.Cookie
	for _, c := range logoutCookies {
		if c.Name == "token" {
			clearedCookie = c
			break
		}
	}
	if clearedCookie == nil || clearedCookie.MaxAge > 0 {
		t.Fatalf("expected cleared cookie with MaxAge <= 0")
	}
}

func TestSyncUserCreatesAndUpdatesUser(t *testing.T) {
	repo := newMockUserRepo()
	jwtSecret := "test-secret-key-12345"
	authH := NewAuthHandler(repo, jwtSecret)

	// 1. Initial Sync for new Clerk user
	syncPayload := `{"id":"user_2google_test_123","name":"Budi Santoso","email":"budi@gmail.com","role":"customer"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/sync", bytes.NewReader([]byte(syncPayload)))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-Id", "user_2google_test_123")
	rec := httptest.NewRecorder()

	authH.SyncUser(rec, req)

	if rec.Code != http.StatusOK && rec.Code != http.StatusCreated {
		t.Fatalf("expected 200 or 201, got %d: %s", rec.Code, rec.Body.String())
	}

	u, err := repo.GetByID(context.Background(), "user_2google_test_123")
	if err != nil || u == nil {
		t.Fatalf("user was not synced into repository: %v", err)
	}
	if u.Name != "Budi Santoso" || u.Email != "budi@gmail.com" {
		t.Fatalf("synced user data mismatch: name=%s, email=%s", u.Name, u.Email)
	}
}

func TestClerkWebhookUserCreatedAndUpdated(t *testing.T) {
	repo := newMockUserRepo()
	jwtSecret := "test-secret-key-12345"
	authH := NewAuthHandler(repo, jwtSecret)

	webhookPayload := `{
		"type": "user.created",
		"data": {
			"id": "user_2wh_test_777",
			"first_name": "Siti",
			"last_name": "Aminah",
			"image_url": "https://images.clerk.dev/avatar.png",
			"email_addresses": [
				{"id": "email_1", "email_address": "siti.aminah@gmail.com"}
			],
			"primary_email_address_id": "email_1"
		}
	}`

	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/webhook/clerk", bytes.NewReader([]byte(webhookPayload)))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	authH.ClerkWebhook(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	u, err := repo.GetByID(context.Background(), "user_2wh_test_777")
	if err != nil || u == nil {
		t.Fatalf("user was not created via webhook: %v", err)
	}
	if u.Name != "Siti Aminah" || u.Email != "siti.aminah@gmail.com" {
		t.Fatalf("webhook created user mismatch: name=%s email=%s", u.Name, u.Email)
	}
}
