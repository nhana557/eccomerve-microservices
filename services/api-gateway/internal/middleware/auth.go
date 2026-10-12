package middleware

import (
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type UserClaims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

func parseRSAPublicKey(pemStr string) (*rsa.PublicKey, error) {
	clean := strings.TrimSpace(pemStr)
	if clean == "" {
		return nil, nil
	}
	block, _ := pem.Decode([]byte(clean))
	if block == nil {
		return nil, jwt.ErrTokenUnverifiable
	}
	pub, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return nil, err
	}
	rsaPub, ok := pub.(*rsa.PublicKey)
	if !ok {
		return nil, jwt.ErrTokenUnverifiable
	}
	return rsaPub, nil
}

// DualEngineAuth supports asymmetric RS256 (Clerk) and symmetric HS256 (internal) verification
func DualEngineAuth(jwtSecret string, clerkPublicKeyPEM string) func(http.Handler) http.Handler {
	parsedRSAKey, _ := parseRSAPublicKey(clerkPublicKeyPEM)

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			tokenStr := ""

			// 1. Try reading token from HttpOnly cookie
			if cookie, err := r.Cookie("token"); err == nil && cookie.Value != "" {
				tokenStr = cookie.Value
			}

			// 2. Fallback to Authorization: Bearer <token>
			if tokenStr == "" {
				authHeader := r.Header.Get("Authorization")
				if strings.HasPrefix(authHeader, "Bearer ") {
					tokenStr = strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
				}
			}

			// If token found, inspect algorithm and verify
			if tokenStr != "" {
				parser := jwt.NewParser()
				unverifiedToken, _, _ := parser.ParseUnverified(tokenStr, jwt.MapClaims{})

				var verifiedClaims jwt.MapClaims
				isValid := false

				// Engine 1: RS256 Clerk Verification
				if unverifiedToken != nil && unverifiedToken.Method != nil && strings.HasPrefix(unverifiedToken.Method.Alg(), "RS") && parsedRSAKey != nil {
					parsedToken, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
						if _, ok := t.Method.(*jwt.SigningMethodRSA); !ok {
							return nil, jwt.ErrSignatureInvalid
						}
						return parsedRSAKey, nil
					})
					if err == nil && parsedToken.Valid {
						if claims, ok := parsedToken.Claims.(jwt.MapClaims); ok {
							verifiedClaims = claims
							isValid = true
						}
					}
				}

				// Engine 2: HS256 Internal Secret Fallback
				if !isValid && jwtSecret != "" {
					parsedToken, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
						if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
							return nil, jwt.ErrSignatureInvalid
						}
						return []byte(jwtSecret), nil
					})
					if err == nil && parsedToken.Valid {
						if claims, ok := parsedToken.Claims.(jwt.MapClaims); ok {
							verifiedClaims = claims
							isValid = true
						}
					}
				}

				// If successfully verified by either engine, extract and inject downstream headers
				if isValid && verifiedClaims != nil {
					userId := ""
					if sub, ok := verifiedClaims["sub"].(string); ok && sub != "" {
						userId = sub
					} else if uid, ok := verifiedClaims["user_id"].(string); ok && uid != "" {
						userId = uid
					}

					email := ""
					if em, ok := verifiedClaims["email"].(string); ok && em != "" {
						email = em
					}

					role := "customer"
					if r, ok := verifiedClaims["role"].(string); ok && r != "" {
						role = r
					}

					if userId != "" {
						r.Header.Set("X-User-Id", userId)
					}
					if email != "" {
						r.Header.Set("X-User-Email", email)
					}
					if role != "" {
						r.Header.Set("X-User-Role", role)
					}
				}
			}

			next.ServeHTTP(w, r)
		})
	}
}

// Auth maintains backwards-compatibility for existing call sites and tests
func Auth(jwtSecret string) func(http.Handler) http.Handler {
	return DualEngineAuth(jwtSecret, "")
}
