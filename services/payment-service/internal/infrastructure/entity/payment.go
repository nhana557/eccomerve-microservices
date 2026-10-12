package entity

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Payment struct {
	ID              string     `gorm:"primaryKey;type:varchar(36)" json:"id"`
	OrderID         string     `gorm:"type:varchar(36);uniqueIndex;not null" json:"order_id"`
	UserID          string     `gorm:"type:varchar(36);index" json:"user_id"`
	Amount          int64      `gorm:"not null" json:"amount"`
	PaymentMethod   string     `gorm:"type:varchar(50);not null" json:"payment_method"`
	Status          string     `gorm:"type:varchar(50);default:'PENDING'" json:"status"`
	VANumber        string     `gorm:"type:varchar(50)" json:"va_number,omitempty"`
	QRString        string     `gorm:"type:text" json:"qr_string,omitempty"`
	PaidAt          *time.Time `json:"paid_at,omitempty"`
	TransactionTime *time.Time `json:"transaction_time,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

func (p *Payment) BeforeCreate(tx *gorm.DB) error {
	if p.ID == "" {
		p.ID = uuid.New().String()
	}
	if p.Status == "" {
		p.Status = "PENDING"
	}
	return nil
}
