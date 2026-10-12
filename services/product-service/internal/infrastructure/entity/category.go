package entity

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Category struct {
	ID        string     `gorm:"primaryKey;type:varchar(36)" json:"id"`
	Name      string     `gorm:"type:varchar(100);not null" json:"name"`
	Slug      string     `gorm:"type:varchar(100);uniqueIndex;not null" json:"slug"`
	IconURL   string     `gorm:"type:text" json:"icon_url"`
	ParentID  *string    `gorm:"type:varchar(36);index" json:"parent_id"`
	Level     int        `gorm:"not null;default:1" json:"level"`
	Children  []Category `gorm:"foreignKey:ParentID" json:"children,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

func (c *Category) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	return nil
}
