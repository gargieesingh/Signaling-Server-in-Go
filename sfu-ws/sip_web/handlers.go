package main

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/google/uuid"
)

// Server holds the application dependencies
type Server struct {
	storage  *Storage
	whatsapp *WhatsAppService
}

// NewServer creates a new server instance
func NewServer() *Server {
	storage := NewStorage()
	return &Server{
		storage:  storage,
		whatsapp: NewWhatsAppService(storage),
	}
}

// RegisterBusiness handles business registration
func (s *Server) RegisterBusiness(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req RegisterBusinessRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, APIResponse{
			Success: false,
			Message: "Invalid request body",
		})
		return
	}

	// Validate input
	if req.Name == "" || req.WhatsAppNumber == "" {
		respondJSON(w, http.StatusBadRequest, APIResponse{
			Success: false,
			Message: "Name and WhatsApp number are required",
		})
		return
	}

	business := &Business{
		ID:             uuid.New().String(),
		Name:           req.Name,
		WhatsAppNumber: req.WhatsAppNumber,
		CreatedAt:      time.Now(),
	}

	s.storage.AddBusiness(business)
	log.Printf("Registered new business: %s (ID: %s)", business.Name, business.ID)

	respondJSON(w, http.StatusCreated, APIResponse{
		Success: true,
		Message: "Business registered successfully",
		Data:    business,
	})
}

// ListBusinesses returns all registered businesses
func (s *Server) ListBusinesses(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	businesses := s.storage.GetAllBusinesses()
	respondJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data:    businesses,
	})
}

// InitiateCall handles call initiation from customer to business
func (s *Server) InitiateCall(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req InitiateCallRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, APIResponse{
			Success: false,
			Message: "Invalid request body",
		})
		return
	}

	// Validate input
	if req.CustomerName == "" || req.CustomerPhone == "" || req.BusinessID == "" {
		respondJSON(w, http.StatusBadRequest, APIResponse{
			Success: false,
			Message: "Customer name, phone, and business ID are required",
		})
		return
	}

	// Get business details
	business, err := s.storage.GetBusiness(req.BusinessID)
	if err != nil {
		respondJSON(w, http.StatusNotFound, APIResponse{
			Success: false,
			Message: "Business not found",
		})
		return
	}

	// Create call record
	call := &Call{
		ID:            uuid.New().String(),
		CustomerName:  req.CustomerName,
		CustomerPhone: req.CustomerPhone,
		BusinessID:    business.ID,
		BusinessName:  business.Name,
		Status:        CallStatusPending,
		InitiatedAt:   time.Now(),
	}

	s.storage.AddCall(call)

	// Send notification to business owner
	if err := s.whatsapp.SendCallNotification(business.ID, call.CustomerName, call.CustomerPhone); err != nil {
		log.Printf("Error sending notification: %v", err)
	}

	// Initiate the call via WhatsApp
	if err := s.whatsapp.InitiateCall(call); err != nil {
		respondJSON(w, http.StatusInternalServerError, APIResponse{
			Success: false,
			Message: "Failed to initiate call",
		})
		return
	}

	log.Printf("Initiated call: %s -> %s (Call ID: %s)", call.CustomerName, business.Name, call.ID)

	respondJSON(w, http.StatusCreated, APIResponse{
		Success: true,
		Message: "Call initiated successfully",
		Data:    call,
	})
}

// GetCallStatus returns the current status of a call
func (s *Server) GetCallStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	callID := r.URL.Query().Get("id")
	if callID == "" {
		respondJSON(w, http.StatusBadRequest, APIResponse{
			Success: false,
			Message: "Call ID is required",
		})
		return
	}

	call, err := s.whatsapp.GetCallStatus(callID)
	if err != nil {
		respondJSON(w, http.StatusNotFound, APIResponse{
			Success: false,
			Message: "Call not found",
		})
		return
	}

	respondJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data:    call,
	})
}

// GetCallHistory returns call history for a business
func (s *Server) GetCallHistory(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	businessID := r.URL.Query().Get("business_id")
	if businessID == "" {
		respondJSON(w, http.StatusBadRequest, APIResponse{
			Success: false,
			Message: "Business ID is required",
		})
		return
	}

	calls := s.storage.GetCallsByBusinessID(businessID)
	respondJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data:    calls,
	})
}

// respondJSON writes a JSON response
func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// enableCORS adds CORS headers to responses
func enableCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}
