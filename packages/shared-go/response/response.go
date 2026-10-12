package response

import (
	"encoding/json"
	"net/http"
	"time"
)

type ErrorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type Metadata struct {
	Timestamp string `json:"timestamp"`
	Service   string `json:"service"`
}

type Envelope struct {
	Success bool         `json:"success"`
	Data    interface{}  `json:"data"`
	Error   *ErrorDetail `json:"error"`
	Meta    Metadata     `json:"meta"`
}

func JSON(w http.ResponseWriter, statusCode int, data interface{}, serviceName string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	env := Envelope{
		Success: true,
		Data:    data,
		Error:   nil,
		Meta: Metadata{
			Timestamp: time.Now().UTC().Format(time.RFC3339),
			Service:   serviceName,
		},
	}
	_ = json.NewEncoder(w).Encode(env)
}

func Error(w http.ResponseWriter, statusCode int, code, message string, serviceName string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	env := Envelope{
		Success: false,
		Data:    nil,
		Error: &ErrorDetail{
			Code:    code,
			Message: message,
		},
		Meta: Metadata{
			Timestamp: time.Now().UTC().Format(time.RFC3339),
			Service:   serviceName,
		},
	}
	_ = json.NewEncoder(w).Encode(env)
}
