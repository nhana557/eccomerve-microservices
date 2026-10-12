package elasticsearch

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"strings"
	"sync/atomic"
	"time"

	"ecommerce-platform/services/product-service/internal/infrastructure/entity"
)

// SearchFilter specifies parameters for full-text search and multi-facet filtering.
type SearchFilter struct {
	CategoryID string
	Category   string
	Search     string
	Sort       string
	MinPrice   int64
	MaxPrice   int64
	MinStock   int
	Limit      int
	Offset     int
}

// Client defines the interface for interacting with the Elasticsearch CQRS read-model.
type Client interface {
	Ping(ctx context.Context) error
	EnsureIndex(ctx context.Context) error
	IndexProduct(ctx context.Context, p *entity.Product) error
	DeleteProduct(ctx context.Context, id string) error
	BulkIndexProducts(ctx context.Context, products []entity.Product) (int, error)
	SearchProducts(ctx context.Context, filter SearchFilter) ([]entity.Product, int64, error)
	IsHealthy() bool
}

type esClient struct {
	baseURL    string
	indexName  string
	httpClient *http.Client
	healthy    atomic.Bool
}

// NewClient initializes a resilient HTTP client configured with a connection pool.
func NewClient(rawURL string) Client {
	cleanURL := strings.TrimRight(strings.TrimSpace(rawURL), "/")
	if cleanURL == "" {
		cleanURL = "http://localhost:9200"
	}

	transport := &http.Transport{
		Proxy: http.ProxyFromEnvironment,
		DialContext: (&net.Dialer{
			Timeout:   2 * time.Second,
			KeepAlive: 30 * time.Second,
		}).DialContext,
		MaxIdleConns:        100,
		MaxIdleConnsPerHost: 50,
		IdleConnTimeout:     90 * time.Second,
		TLSHandshakeTimeout: 2 * time.Second,
	}

	c := &esClient{
		baseURL:   cleanURL,
		indexName: "products",
		httpClient: &http.Client{
			Transport: transport,
			Timeout:   15 * time.Second,
		},
	}

	// Immediate ping and background auto-recovery health check loop
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		_ = c.Ping(ctx)
		cancel()

		ticker := time.NewTicker(10 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			pCtx, pCancel := context.WithTimeout(context.Background(), 2*time.Second)
			_ = c.Ping(pCtx)
			pCancel()
		}
	}()

	return c
}

func (c *esClient) IsHealthy() bool {
	return c.healthy.Load()
}

func (c *esClient) Ping(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/", nil)
	if err != nil {
		c.healthy.Store(false)
		return err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		c.healthy.Store(false)
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		c.healthy.Store(true)
		return nil
	}

	c.healthy.Store(false)
	return fmt.Errorf("elasticsearch ping returned status: %d", resp.StatusCode)
}

func (c *esClient) EnsureIndex(ctx context.Context) error {
	indexURL := fmt.Sprintf("%s/%s", c.baseURL, c.indexName)

	// 1. Check if index already exists (HEAD /products)
	headReq, err := http.NewRequestWithContext(ctx, http.MethodHead, indexURL, nil)
	if err != nil {
		return err
	}
	headResp, err := c.httpClient.Do(headReq)
	if err == nil {
		headResp.Body.Close()
		if headResp.StatusCode == http.StatusOK {
			c.healthy.Store(true)
			return nil
		}
	}

	// 2. Index does not exist, create it with optimized CQRS read-model mapping
	mappingPayload := map[string]any{
		"settings": map[string]any{
			"number_of_shards":   1,
			"number_of_replicas": 0,
			"refresh_interval":   "1s",
		},
		"mappings": map[string]any{
			"properties": map[string]any{
				"id": map[string]any{"type": "keyword"},
				"name": map[string]any{
					"type": "text",
					"fields": map[string]any{
						"keyword": map[string]any{"type": "keyword", "ignore_above": 256},
					},
				},
				"description": map[string]any{"type": "text"},
				"price":       map[string]any{"type": "long"},
				"stock":       map[string]any{"type": "integer"},
				"category":    map[string]any{"type": "keyword"},
				"category_id": map[string]any{"type": "keyword"},
				"image_url":   map[string]any{"type": "keyword", "index": false},
				"created_at":  map[string]any{"type": "date"},
			},
		},
	}

	bodyBytes, err := json.Marshal(mappingPayload)
	if err != nil {
		return err
	}

	putReq, err := http.NewRequestWithContext(ctx, http.MethodPut, indexURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return err
	}
	putReq.Header.Set("Content-Type", "application/json")

	putResp, err := c.httpClient.Do(putReq)
	if err != nil {
		c.healthy.Store(false)
		return err
	}
	defer putResp.Body.Close()

	if putResp.StatusCode >= 200 && putResp.StatusCode < 300 {
		c.healthy.Store(true)
		return nil
	}

	respBody, _ := io.ReadAll(putResp.Body)
	return fmt.Errorf("failed to create elasticsearch index (status %d): %s", putResp.StatusCode, string(respBody))
}

func (c *esClient) IndexProduct(ctx context.Context, p *entity.Product) error {
	docURL := fmt.Sprintf("%s/%s/_doc/%s", c.baseURL, c.indexName, p.ID)

	payload, err := json.Marshal(p)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPut, docURL, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		c.healthy.Store(false)
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		c.healthy.Store(true)
		return nil
	}

	respBody, _ := io.ReadAll(resp.Body)
	return fmt.Errorf("failed to index product %s (status %d): %s", p.ID, resp.StatusCode, string(respBody))
}

func (c *esClient) DeleteProduct(ctx context.Context, id string) error {
	docURL := fmt.Sprintf("%s/%s/_doc/%s", c.baseURL, c.indexName, id)

	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, docURL, nil)
	if err != nil {
		return err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		c.healthy.Store(false)
		return err
	}
	defer resp.Body.Close()

	if (resp.StatusCode >= 200 && resp.StatusCode < 300) || resp.StatusCode == http.StatusNotFound {
		c.healthy.Store(true)
		return nil
	}

	respBody, _ := io.ReadAll(resp.Body)
	return fmt.Errorf("failed to delete product %s (status %d): %s", id, resp.StatusCode, string(respBody))
}

func (c *esClient) BulkIndexProducts(ctx context.Context, products []entity.Product) (int, error) {
	if len(products) == 0 {
		return 0, nil
	}

	const batchSize = 2000
	totalSynced := 0

	for i := 0; i < len(products); i += batchSize {
		end := i + batchSize
		if end > len(products) {
			end = len(products)
		}
		chunk := products[i:end]

		var buf bytes.Buffer
		for _, p := range chunk {
			meta := fmt.Sprintf(`{"index":{"_index":"%s","_id":"%s"}}`, c.indexName, p.ID)
			buf.WriteString(meta)
			buf.WriteByte('\n')

			docBytes, err := json.Marshal(p)
			if err != nil {
				return totalSynced, err
			}
			buf.Write(docBytes)
			buf.WriteByte('\n')
		}

		bulkURL := fmt.Sprintf("%s/_bulk", c.baseURL)
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, bulkURL, &buf)
		if err != nil {
			return totalSynced, err
		}
		req.Header.Set("Content-Type", "application/x-ndjson")

		resp, err := c.httpClient.Do(req)
		if err != nil {
			c.healthy.Store(false)
			return totalSynced, err
		}

		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			respBody, _ := io.ReadAll(resp.Body)
			resp.Body.Close()
			c.healthy.Store(false)
			return totalSynced, fmt.Errorf("bulk index failed (status %d): %s", resp.StatusCode, string(respBody))
		}
		resp.Body.Close()
		totalSynced += len(chunk)
	}

	c.healthy.Store(true)
	return totalSynced, nil
}

func (c *esClient) SearchProducts(ctx context.Context, filter SearchFilter) ([]entity.Product, int64, error) {
	searchURL := fmt.Sprintf("%s/%s/_search", c.baseURL, c.indexName)

	dsl, err := BuildSearchDSL(filter)
	if err != nil {
		return nil, 0, err
	}

	bodyBytes, err := json.Marshal(dsl)
	if err != nil {
		return nil, 0, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, searchURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		c.healthy.Store(false)
		return nil, 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		respBody, _ := io.ReadAll(resp.Body)
		c.healthy.Store(false)
		return nil, 0, fmt.Errorf("search failed with status %d: %s", resp.StatusCode, string(respBody))
	}

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, 0, err
	}

	c.healthy.Store(true)
	return ParseSearchResponse(respBody)
}
