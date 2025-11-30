package main

import (
	"time"
)

// Business represents a registered business owner
type Business struct {
	ID             string    `json:"id"`
	Name           string    `json:"name"`
	WhatsAppNumber string    `json:"whatsapp_number"`
	CreatedAt      time.Time `json:"created_at"`
}

// CallStatus represents the current status of a call
type CallStatus string

const (
	CallStatusPending   CallStatus = "pending"
	CallStatusRinging   CallStatus = "ringing"
	CallStatusConnected CallStatus = "connected"
	CallStatusEnded     CallStatus = "ended"
	CallStatusFailed    CallStatus = "failed"
)

// Call represents a call from customer to business
type Call struct {
	ID             string     `json:"id"`
	CustomerName   string     `json:"customer_name"`
	CustomerPhone  string     `json:"customer_phone"`
	BusinessID     string     `json:"business_id"`
	BusinessName   string     `json:"business_name"`
	Status         CallStatus `json:"status"`
	InitiatedAt    time.Time  `json:"initiated_at"`
	ConnectedAt    *time.Time `json:"connected_at,omitempty"`
	EndedAt        *time.Time `json:"ended_at,omitempty"`
	Duration       int        `json:"duration"` // in seconds
}

// RegisterBusinessRequest is the request payload for registering a business
type RegisterBusinessRequest struct {
	Name           string `json:"name"`
	WhatsAppNumber string `json:"whatsapp_number"`
}

// InitiateCallRequest is the request payload for initiating a call
type InitiateCallRequest struct {
	CustomerName  string `json:"customer_name"`
	CustomerPhone string `json:"customer_phone"`
	BusinessID    string `json:"business_id"`
}

// APIResponse is a generic API response
type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
}
