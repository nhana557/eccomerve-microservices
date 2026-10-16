# Stage 1: Build binary
FROM golang:1.26-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git ca-certificates tzdata

# Copy go module manifests
COPY packages/shared-go/go.mod packages/shared-go/go.sum* ./packages/shared-go/
COPY packages/proto/go.mod packages/proto/go.sum* ./packages/proto/
COPY services/auth-service/go.mod services/auth-service/go.sum* ./services/auth-service/

# Init isolated workspace for this service and download dependencies
RUN go work init ./packages/shared-go ./packages/proto ./services/auth-service && \
    (cd services/auth-service && go mod download)

# Copy source code
COPY packages/shared-go ./packages/shared-go
COPY packages/proto ./packages/proto
COPY services/auth-service ./services/auth-service

# Build static binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /bin/auth-service ./services/auth-service/cmd/server

# Stage 2: Minimal Runtime
FROM alpine:3.20

RUN apk --no-cache add ca-certificates tzdata && \
    addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app
COPY --from=builder /bin/auth-service /bin/auth-service

USER appuser

EXPOSE 8081

CMD ["/bin/auth-service"]
