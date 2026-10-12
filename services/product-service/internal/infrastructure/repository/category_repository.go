package repository

import (
	"context"

	"ecommerce-platform/services/product-service/internal/infrastructure/entity"
	"gorm.io/gorm"
)

type CategoryRepository interface {
	Create(ctx context.Context, category *entity.Category) error
	GetByID(ctx context.Context, id string) (*entity.Category, error)
	GetBySlug(ctx context.Context, slug string) (*entity.Category, error)
	ListHierarchy(ctx context.Context) ([]entity.Category, error)
	CreateBatch(ctx context.Context, categories []entity.Category) error
}

type gormCategoryRepository struct {
	db *gorm.DB
}

func NewGormCategoryRepository(db *gorm.DB) CategoryRepository {
	return &gormCategoryRepository{db: db}
}

func (r *gormCategoryRepository) Create(ctx context.Context, category *entity.Category) error {
	return r.db.WithContext(ctx).Create(category).Error
}

func (r *gormCategoryRepository) GetByID(ctx context.Context, id string) (*entity.Category, error) {
	var category entity.Category
	if err := r.db.WithContext(ctx).Preload("Children").First(&category, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &category, nil
}

func (r *gormCategoryRepository) GetBySlug(ctx context.Context, slug string) (*entity.Category, error) {
	var category entity.Category
	if err := r.db.WithContext(ctx).Preload("Children").First(&category, "slug = ?", slug).Error; err != nil {
		return nil, err
	}
	return &category, nil
}

func (r *gormCategoryRepository) ListHierarchy(ctx context.Context) ([]entity.Category, error) {
	var rootCategories []entity.Category
	err := r.db.WithContext(ctx).
		Where("parent_id IS NULL OR parent_id = ''").
		Preload("Children").
		Order("level ASC, name ASC").
		Find(&rootCategories).Error
	if err != nil {
		return nil, err
	}
	return rootCategories, nil
}

func (r *gormCategoryRepository) CreateBatch(ctx context.Context, categories []entity.Category) error {
	return r.db.WithContext(ctx).Create(&categories).Error
}
