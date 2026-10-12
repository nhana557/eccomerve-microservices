package handler

import (
	"net/http"
	"time"

	"ecommerce-platform/packages/shared-go/response"
)

type HealthHandler struct {
	serviceName string
	services    map[string]string
	client      *http.Client
}

func NewHealthHandler(serviceName string, services map[string]string) *HealthHandler {
	return &HealthHandler{
		serviceName: serviceName,
		services:    services,
		client:      &http.Client{Timeout: 1 * time.Second},
	}
}

func (h *HealthHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	statuses := make(map[string]string)
	statuses[h.serviceName] = "healthy"

	for name, target := range h.services {
		resp, err := h.client.Get(target + "/health")
		if err != nil || resp.StatusCode != http.StatusOK {
			statuses[name] = "offline"
		} else {
			statuses[name] = "healthy"
			_ = resp.Body.Close()
		}
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"status":   "healthy",
		"services": statuses,
	}, h.serviceName)
}
