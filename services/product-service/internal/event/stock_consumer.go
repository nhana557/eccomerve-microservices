package event

import (
	"encoding/json"
	"log"

	amqp "github.com/rabbitmq/amqp091-go"
	"gorm.io/gorm"
)

type StockEventItem struct {
	ProductID string `json:"product_id"`
	Quantity  int    `json:"quantity"`
}

type StockEvent struct {
	EventID   string `json:"event_id"`
	EventType string `json:"event_type"`
	Data      struct {
		OrderID   string           `json:"order_id"`
		PaymentID string           `json:"payment_id"`
		Items     []StockEventItem `json:"items"`
	} `json:"data"`
}

func ProcessStockDeductionPayload(body []byte, db *gorm.DB) error {
	var evt StockEvent
	if err := json.Unmarshal(body, &evt); err != nil {
		return err
	}

	for _, it := range evt.Data.Items {
		if it.ProductID != "" && it.Quantity > 0 {
			res := db.Exec("UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?", it.Quantity, it.ProductID, it.Quantity)
			if res.Error != nil {
				log.Printf("[ProductService] Gagal memotong stok product %s: %v", it.ProductID, res.Error)
			} else {
				log.Printf("[ProductService] Stok produk %s berhasil dipotong %d", it.ProductID, it.Quantity)
			}
		}
	}
	return nil
}

func StartStockConsumer(amqpURL string, db *gorm.DB) (*amqp.Connection, *amqp.Channel, error) {
	conn, err := amqp.Dial(amqpURL)
	if err != nil {
		return nil, nil, err
	}
	ch, err := conn.Channel()
	if err != nil {
		_ = conn.Close()
		return nil, nil, err
	}

	err = ch.ExchangeDeclare("ecommerce.events", "topic", true, false, false, false, nil)
	if err != nil {
		_ = ch.Close()
		_ = conn.Close()
		return nil, nil, err
	}

	q, err := ch.QueueDeclare("product.deduct-stock", true, false, false, false, nil)
	if err != nil {
		_ = ch.Close()
		_ = conn.Close()
		return nil, nil, err
	}

	err = ch.QueueBind(q.Name, "payment.completed", "ecommerce.events", false, nil)
	if err != nil {
		_ = ch.Close()
		_ = conn.Close()
		return nil, nil, err
	}

	msgs, err := ch.Consume(q.Name, "product-service", true, false, false, false, nil)
	if err != nil {
		_ = ch.Close()
		_ = conn.Close()
		return nil, nil, err
	}

	go func() {
		for d := range msgs {
			if err := ProcessStockDeductionPayload(d.Body, db); err != nil {
				log.Printf("[ProductService] Error memproses payload stock: %v", err)
			}
		}
	}()

	return conn, ch, nil
}
