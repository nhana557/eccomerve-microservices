package event

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	amqp "github.com/rabbitmq/amqp091-go"
)

type PaymentProducer interface {
	PublishPaymentCompleted(orderID, paymentID, userID string, amount int64) error
}

type AmqpPaymentProducer struct {
	conn    *amqp.Connection
	channel *amqp.Channel
}

func NewAmqpPaymentProducer(amqpURL string) (*AmqpPaymentProducer, error) {
	conn, err := amqp.Dial(amqpURL)
	if err != nil {
		return nil, err
	}
	ch, err := conn.Channel()
	if err != nil {
		_ = conn.Close()
		return nil, err
	}

	err = ch.ExchangeDeclare("ecommerce.events", "topic", true, false, false, false, nil)
	if err != nil {
		_ = ch.Close()
		_ = conn.Close()
		return nil, err
	}

	return &AmqpPaymentProducer{
		conn:    conn,
		channel: ch,
	}, nil
}

func (p *AmqpPaymentProducer) Close() {
	if p.channel != nil {
		_ = p.channel.Close()
	}
	if p.conn != nil {
		_ = p.conn.Close()
	}
}

func (p *AmqpPaymentProducer) PublishPaymentCompleted(orderID, paymentID, userID string, amount int64) error {
	payload := map[string]interface{}{
		"event_id":   uuid.New().String(),
		"event_type": "payment.completed",
		"timestamp":  time.Now().UTC().Format(time.RFC3339),
		"data": map[string]interface{}{
			"payment_id": paymentID,
			"order_id":   orderID,
			"user_id":    userID,
			"amount":     amount,
			"status":     "PAID",
		},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	return p.channel.PublishWithContext(
		context.Background(),
		"ecommerce.events",
		"payment.completed",
		false,
		false,
		amqp.Publishing{
			ContentType:  "application/json",
			DeliveryMode: amqp.Persistent,
			Body:         body,
		},
	)
}
