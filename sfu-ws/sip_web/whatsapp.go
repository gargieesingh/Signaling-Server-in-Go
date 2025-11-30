package main

import (
	"fmt"
	"log"
	"time"
)

// WhatsAppService simulates WhatsApp Business API integration
type WhatsAppService struct {
	storage *Storage
}

// NewWhatsAppService creates a new WhatsApp service
func NewWhatsAppService(storage *Storage) *WhatsAppService {
	return &WhatsAppService{
		storage: storage,
	}
}

// InitiateCall simulates initiating a call via WhatsApp Business API
func (w *WhatsAppService) InitiateCall(call *Call) error {
	// In a real implementation, this would:
	// 1. Call WhatsApp Business API to initiate the call
	// 2. Set up webhooks to receive call status updates
	// 3. Return the call ID from WhatsApp
	
	log.Printf("Simulating WhatsApp call initiation: Customer %s calling Business %s", 
		call.CustomerName, call.BusinessName)
	
	// Simulate async call status updates
	go w.simulateCallProgress(call.ID)
	
	return nil
}

// simulateCallProgress simulates the progression of a call through different statuses
func (w *WhatsAppService) simulateCallProgress(callID string) {
	// Simulate call ringing after 2 seconds
	time.Sleep(2 * time.Second)
	w.updateCallStatus(callID, CallStatusRinging)
	
	// Simulate call being answered after 5 seconds
	time.Sleep(5 * time.Second)
	w.updateCallStatus(callID, CallStatusConnected)
	
	// Simulate call ending after 15 seconds
	time.Sleep(15 * time.Second)
	w.updateCallStatus(callID, CallStatusEnded)
}

// updateCallStatus updates the status of a call
func (w *WhatsAppService) updateCallStatus(callID string, status CallStatus) {
	call, err := w.storage.GetCall(callID)
	if err != nil {
		log.Printf("Error getting call %s: %v", callID, err)
		return
	}
	
	call.Status = status
	now := time.Now()
	
	switch status {
	case CallStatusConnected:
		call.ConnectedAt = &now
		log.Printf("Call %s connected", callID)
	case CallStatusEnded:
		call.EndedAt = &now
		if call.ConnectedAt != nil {
			call.Duration = int(now.Sub(*call.ConnectedAt).Seconds())
		}
		log.Printf("Call %s ended (duration: %d seconds)", callID, call.Duration)
	case CallStatusFailed:
		call.EndedAt = &now
		log.Printf("Call %s failed", callID)
	default:
		log.Printf("Call %s status updated to %s", callID, status)
	}
	
	if err := w.storage.UpdateCall(call); err != nil {
		log.Printf("Error updating call %s: %v", callID, err)
	}
}

// SendCallNotification simulates sending a notification to the business owner
func (w *WhatsAppService) SendCallNotification(businessID, customerName, customerPhone string) error {
	business, err := w.storage.GetBusiness(businessID)
	if err != nil {
		return err
	}
	
	// In a real implementation, this would send a WhatsApp message/notification
	// to the business owner's WhatsApp number
	log.Printf("Sending call notification to %s (WhatsApp: %s) - Incoming call from %s (%s)",
		business.Name, business.WhatsAppNumber, customerName, customerPhone)
	
	return nil
}

// GetCallStatus retrieves the current status of a call
func (w *WhatsAppService) GetCallStatus(callID string) (*Call, error) {
	call, err := w.storage.GetCall(callID)
	if err != nil {
		return nil, fmt.Errorf("call not found: %v", err)
	}
	return call, nil
}
