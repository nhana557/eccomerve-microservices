package repository

import (
	"context"
	"errors"
	"time"

	"ecommerce-platform/services/auth-service/internal/infrastructure/entity"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type UserRepository interface {
	Create(ctx context.Context, user *entity.User) error
	GetByID(ctx context.Context, id string) (*entity.User, error)
	GetByEmail(ctx context.Context, email string) (*entity.User, error)
	List(ctx context.Context, limit, offset int) ([]entity.User, int64, error)
	Update(ctx context.Context, user *entity.User) error
	Upsert(ctx context.Context, user *entity.User) error
	Delete(ctx context.Context, id string) error
	SeedDemoUsers(ctx context.Context) error
}

type gormUserRepository struct {
	db *gorm.DB
}

func NewGormUserRepository(db *gorm.DB) UserRepository {
	return &gormUserRepository{db: db}
}

func (r *gormUserRepository) Create(ctx context.Context, user *entity.User) error {
	return r.db.WithContext(ctx).Create(user).Error
}

func (r *gormUserRepository) GetByID(ctx context.Context, id string) (*entity.User, error) {
	var user entity.User
	if err := r.db.WithContext(ctx).First(&user, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *gormUserRepository) GetByEmail(ctx context.Context, email string) (*entity.User, error) {
	var user entity.User
	if err := r.db.WithContext(ctx).First(&user, "email = ?", email).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *gormUserRepository) List(ctx context.Context, limit, offset int) ([]entity.User, int64, error) {
	var users []entity.User
	var total int64
	if limit <= 0 {
		limit = 10
	}
	db := r.db.WithContext(ctx).Model(&entity.User{})
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if err := db.Limit(limit).Offset(offset).Find(&users).Error; err != nil {
		return nil, 0, err
	}
	return users, total, nil
}

func (r *gormUserRepository) Update(ctx context.Context, user *entity.User) error {
	return r.db.WithContext(ctx).Save(user).Error
}

func (r *gormUserRepository) Upsert(ctx context.Context, user *entity.User) error {
	var existing entity.User
	err := r.db.WithContext(ctx).Where("id = ? OR email = ?", user.ID, user.Email).First(&existing).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			if user.PasswordHash == "" {
				user.PasswordHash = "CLERK_MANAGED_ACCOUNT"
			}
			return r.db.WithContext(ctx).Create(user).Error
		}
		return err
	}

	existing.Name = user.Name
	if user.Role != "" {
		existing.Role = user.Role
	}
	if user.AvatarURL != "" {
		existing.AvatarURL = user.AvatarURL
	}
	existing.UpdatedAt = time.Now()
	*user = existing
	return r.db.WithContext(ctx).Save(&existing).Error
}

func (r *gormUserRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&entity.User{}, "id = ?", id).Error
}

func (r *gormUserRepository) SeedDemoUsers(ctx context.Context) error {
	demoUsers := []struct {
		ID       string
		Name     string
		Email    string
		Password string
		Role     string
	}{
		{
			ID:       "demo-user-budi-id",
			Name:     "Budi Santoso",
			Email:    "budi@example.com",
			Password: "password123",
			Role:     "customer",
		},
		{
			ID:       "demo-user-admin-id",
			Name:     "Admin T.STORE",
			Email:    "admin@tstore.com",
			Password: "password123",
			Role:     "admin",
		},
	}

	for _, d := range demoUsers {
		var existing entity.User
		err := r.db.WithContext(ctx).Where("email = ?", d.Email).First(&existing).Error
		if err != nil && errors.Is(err, gorm.ErrRecordNotFound) {
			hashed, _ := bcrypt.GenerateFromPassword([]byte(d.Password), bcrypt.DefaultCost)
			u := entity.User{
				ID:           d.ID,
				Name:         d.Name,
				Email:        d.Email,
				PasswordHash: string(hashed),
				Role:         d.Role,
			}
			_ = r.db.WithContext(ctx).Create(&u).Error
		}
	}
	return nil
}
