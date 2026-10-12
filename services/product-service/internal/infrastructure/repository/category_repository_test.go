package repository_test

import (
	"context"
	"testing"

	"ecommerce-platform/packages/shared-go/database"
	"ecommerce-platform/services/product-service/internal/infrastructure/entity"
	"ecommerce-platform/services/product-service/internal/infrastructure/repository"
)

func TestCategoryRepository_Hierarchy(t *testing.T) {
	db, err := database.NewTestDB()
	if err != nil {
		t.Fatalf("failed to create test db: %v", err)
	}
	if err := db.AutoMigrate(&entity.Category{}, &entity.Product{}); err != nil {
		t.Fatalf("failed to auto-migrate test db: %v", err)
	}

	repo := repository.NewGormCategoryRepository(db)
	ctx := context.Background()

	parent := entity.Category{
		ID:    "cat-elec",
		Name:  "Elektronik",
		Slug:  "elektronik",
		Level: 1,
	}
	if err := repo.Create(ctx, &parent); err != nil {
		t.Fatalf("failed to create parent category: %v", err)
	}

	child := entity.Category{
		ID:       "cat-audio",
		Name:     "Audio & Speaker",
		Slug:     "audio-speaker",
		ParentID: &parent.ID,
		Level:    2,
	}
	if err := repo.Create(ctx, &child); err != nil {
		t.Fatalf("failed to create child category: %v", err)
	}

	tree, err := repo.ListHierarchy(ctx)
	if err != nil {
		t.Fatalf("failed to list category hierarchy: %v", err)
	}

	if len(tree) != 1 {
		t.Fatalf("expected 1 root category, got %d", len(tree))
	}
	if tree[0].Name != "Elektronik" {
		t.Errorf("expected parent name Elektronik, got %s", tree[0].Name)
	}
	if len(tree[0].Children) != 1 {
		t.Fatalf("expected 1 child category, got %d", len(tree[0].Children))
	}
	if tree[0].Children[0].Name != "Audio & Speaker" {
		t.Errorf("expected child name Audio & Speaker, got %s", tree[0].Children[0].Name)
	}

	bySlug, err := repo.GetBySlug(ctx, "elektronik")
	if err != nil || bySlug == nil {
		t.Fatalf("failed to get by slug: %v", err)
	}
	if bySlug.ID != "cat-elec" {
		t.Errorf("expected cat-elec, got %s", bySlug.ID)
	}
}
