package database_test

import (
	"testing"

	"ecommerce-platform/packages/shared-go/database"
)

func TestNewTestDB(t *testing.T) {
	db, err := database.NewTestDB()
	if err != nil {
		t.Fatalf("expected no error creating test db, got %v", err)
	}
	if db == nil {
		t.Fatal("expected non-nil *gorm.DB")
	}
}
