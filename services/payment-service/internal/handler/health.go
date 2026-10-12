package handler

import (
	"net/http"

	"ecommerce-platform/packages/shared-go/response"
)

func HealthHandler(serviceName string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		status := map[string]string{
			"status":  "healthy",
			"service": serviceName,
		}
		response.JSON(w, http.StatusOK, status, serviceName)
	}
}
