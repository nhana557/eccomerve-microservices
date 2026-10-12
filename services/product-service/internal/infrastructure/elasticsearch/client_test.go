package elasticsearch

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"ecommerce-platform/services/product-service/internal/infrastructure/entity"
)

func TestClient_Ping_Success(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"name":"test-node","cluster_name":"docker-cluster"}`))
			return
		}
		http.NotFound(w, r)
	}))
	defer ts.Close()

	client := NewClient(ts.URL)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	if err := client.Ping(ctx); err != nil {
		t.Fatalf("expected ping success, got: %v", err)
	}
	if !client.IsHealthy() {
		t.Fatalf("expected client to be healthy")
	}
}

func TestClient_Ping_Failure(t *testing.T) {
	// Client pointed to dead port
	client := NewClient("http://127.0.0.1:59999")
	ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
	defer cancel()

	if err := client.Ping(ctx); err == nil {
		t.Fatalf("expected ping failure, got nil")
	}
	if client.IsHealthy() {
		t.Fatalf("expected client to be unhealthy")
	}
}

func TestClient_EnsureIndex(t *testing.T) {
	headCalled := false
	putCalled := false

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodHead && r.URL.Path == "/products" {
			headCalled = true
			w.WriteHeader(http.StatusNotFound)
			return
		}
		if r.Method == http.MethodPut && r.URL.Path == "/products" {
			putCalled = true
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"acknowledged":true,"index":"products"}`))
			return
		}
		http.NotFound(w, r)
	}))
	defer ts.Close()

	client := NewClient(ts.URL)
	if err := client.EnsureIndex(context.Background()); err != nil {
		t.Fatalf("expected EnsureIndex success, got: %v", err)
	}
	if !headCalled {
		t.Errorf("expected HEAD /products to be called")
	}
	if !putCalled {
		t.Errorf("expected PUT /products to be called")
	}
}

func TestClient_IndexAndBulkProduct(t *testing.T) {
	var lastMethod string
	var lastPath string

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet && r.URL.Path == "/" {
			w.WriteHeader(http.StatusOK)
			return
		}
		lastMethod = r.Method
		lastPath = r.URL.Path
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"items":[],"errors":false}`))
	}))
	defer ts.Close()

	client := NewClient(ts.URL)
	prod := entity.Product{
		ID:       "p-test-1",
		Name:     "Keyboard Mechanical",
		Price:    1200000,
		Stock:    50,
		Category: "Elektronik",
	}

	// 1. Single Index
	if err := client.IndexProduct(context.Background(), &prod); err != nil {
		t.Fatalf("IndexProduct failed: %v", err)
	}
	if lastMethod != http.MethodPut || lastPath != "/products/_doc/p-test-1" {
		t.Errorf("unexpected index request: %s %s", lastMethod, lastPath)
	}

	// 2. Bulk Index
	count, err := client.BulkIndexProducts(context.Background(), []entity.Product{prod})
	if err != nil {
		t.Fatalf("BulkIndexProducts failed: %v", err)
	}
	if count != 1 {
		t.Errorf("expected count 1, got %d", count)
	}
	if lastMethod != http.MethodPost || lastPath != "/_bulk" {
		t.Errorf("unexpected bulk request: %s %s", lastMethod, lastPath)
	}
}
