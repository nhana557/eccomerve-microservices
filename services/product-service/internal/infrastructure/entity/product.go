package entity

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Product struct {
	ID          string    `gorm:"primaryKey;type:varchar(36)" json:"id"`
	Name        string    `gorm:"type:varchar(255);not null" json:"name"`
	Description string    `gorm:"type:text" json:"description"`
	Price       int64     `gorm:"not null;index" json:"price"`
	Stock       int       `gorm:"not null;default:0" json:"stock"`
	Category    string    `gorm:"type:varchar(100)" json:"category"`
	CategoryID  *string   `gorm:"type:varchar(36);index" json:"category_id"`
	ImageURL    string    `gorm:"type:text" json:"image_url"`
	CreatedAt   time.Time `gorm:"index:idx_products_created_at_desc,sort:desc" json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (p *Product) BeforeCreate(tx *gorm.DB) error {
	if p.ID == "" {
		p.ID = uuid.New().String()
	}
	return nil
}
