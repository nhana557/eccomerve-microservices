# Stage 1: Build binary
FROM golang:1.24-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git ca-certificates tzdata

# Copy workspace and go module manifests
COPY go.work go.work.sum ./
COPY packages/shared-go/go.mod packages/shared-go/go.sum* ./packages/shared-go/
COPY packages/proto/go.mod packages/proto/go.sum* ./packages/proto/
COPY services/payment-service/go.mod services/payment-service/go.sum* ./services/payment-service/

# Download dependencies
RUN go mod download -x 2>/dev/null || true

# Copy source code
COPY packages/shared-go ./packages/shared-go
COPY packages/proto ./packages/proto
COPY services/payment-service ./services/payment-service

# Build static binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /bin/payment-service ./services/payment-service/cmd/server

# Stage 2: Minimal Runtime
FROM alpine:3.20

RUN apk --no-cache add ca-certificates tzdata && \
    addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app
COPY --from=builder /bin/payment-service /bin/payment-service

USER appuser

EXPOSE 8084

CMD ["/bin/payment-service"]
