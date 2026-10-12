package repository

import (
	"context"
	"time"

	"ecommerce-platform/services/payment-service/internal/infrastructure/entity"
	"gorm.io/gorm"
)

type PaymentRepository interface {
	Create(ctx context.Context, payment *entity.Payment) error
	GetByID(ctx context.Context, id string) (*entity.Payment, error)
	GetByOrderID(ctx context.Context, orderID string) (*entity.Payment, error)
	List(ctx context.Context, limit, offset int) ([]entity.Payment, int64, error)
	UpdateStatus(ctx context.Context, id string, status string, txTime *time.Time) error
	UpdateStatusAtomic(ctx context.Context, id string, fromStatus string, toStatus string, txTime *time.Time) (bool, error)
	Delete(ctx context.Context, id string) error
}

type gormPaymentRepository struct {
	db *gorm.DB
}

func NewGormPaymentRepository(db *gorm.DB) PaymentRepository {
	return &gormPaymentRepository{db: db}
}

func (r *gormPaymentRepository) Create(ctx context.Context, payment *entity.Payment) error {
	return r.db.WithContext(ctx).Create(payment).Error
}

func (r *gormPaymentRepository) GetByID(ctx context.Context, id string) (*entity.Payment, error) {
	var payment entity.Payment
	if err := r.db.WithContext(ctx).First(&payment, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &payment, nil
}

func (r *gormPaymentRepository) GetByOrderID(ctx context.Context, orderID string) (*entity.Payment, error) {
	var payment entity.Payment
	if err := r.db.WithContext(ctx).First(&payment, "order_id = ?", orderID).Error; err != nil {
		return nil, err
	}
	return &payment, nil
}

func (r *gormPaymentRepository) List(ctx context.Context, limit, offset int) ([]entity.Payment, int64, error) {
	var payments []entity.Payment
	var total int64
	if limit <= 0 {
		limit = 10
	}
	db := r.db.WithContext(ctx).Model(&entity.Payment{})
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if err := db.Limit(limit).Offset(offset).Find(&payments).Error; err != nil {
		return nil, 0, err
	}
	return payments, total, nil
}

func (r *gormPaymentRepository) UpdateStatus(ctx context.Context, id string, status string, txTime *time.Time) error {
	updates := map[string]interface{}{
		"status": status,
	}
	if txTime != nil {
		updates["transaction_time"] = txTime
	}
	return r.db.WithContext(ctx).Model(&entity.Payment{}).Where("id = ?", id).Updates(updates).Error
}

func (r *gormPaymentRepository) UpdateStatusAtomic(ctx context.Context, id string, fromStatus string, toStatus string, txTime *time.Time) (bool, error) {
	updates := map[string]interface{}{
		"status": toStatus,
	}
	if txTime != nil {
		updates["transaction_time"] = txTime
		if toStatus == "SUCCESS" {
			updates["paid_at"] = txTime
		}
	}
	result := r.db.WithContext(ctx).Model(&entity.Payment{}).
		Where("id = ? AND status = ?", id, fromStatus).
		Updates(updates)
	if result.Error != nil {
		return false, result.Error
	}
	return result.RowsAffected > 0, nil
}

func (r *gormPaymentRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&entity.Payment{}, "id = ?", id).Error
}
