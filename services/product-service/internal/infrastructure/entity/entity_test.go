package entity_test

import (
	"testing"

	"ecommerce-platform/services/product-service/internal/infrastructure/entity"
)

func TestCategoryAndProductEntities(t *testing.T) {
	cat := entity.Category{
		Name:    "Komputer & Laptop",
		Slug:    "komputer-laptop",
		IconURL: "https://example.com/icon.png",
		Level:   1,
	}

	if err := cat.BeforeCreate(nil); err != nil {
		t.Fatalf("unexpected error in Category.BeforeCreate: %v", err)
	}
	if cat.ID == "" {
		t.Errorf("expected generated UUID ID for Category, got empty string")
	}

	prod := entity.Product{
		Name:       "ASUS ROG Laptop",
		Price:      25000000,
		Stock:      10,
		Category:   "Komputer & Laptop",
		CategoryID: &cat.ID,
		ImageURL:   "https://images.unsplash.com/photo-laptop",
	}

	if err := prod.BeforeCreate(nil); err != nil {
		t.Fatalf("unexpected error in Product.BeforeCreate: %v", err)
	}
	if prod.ID == "" {
		t.Errorf("expected generated UUID ID for Product, got empty string")
	}
	if prod.ImageURL != "https://images.unsplash.com/photo-laptop" {
		t.Errorf("expected ImageURL to be preserved, got %s", prod.ImageURL)
	}
	if prod.CategoryID == nil || *prod.CategoryID != cat.ID {
		t.Errorf("expected CategoryID to match %s, got %v", cat.ID, prod.CategoryID)
	}
}
