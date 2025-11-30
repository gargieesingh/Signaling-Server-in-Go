package main

import (
	"fmt"
	"sync"
)

// Storage provides in-memory storage for businesses and calls
type Storage struct {
	businesses map[string]*Business
	calls      map[string]*Call
	mu         sync.RWMutex
}

// NewStorage creates a new storage instance
func NewStorage() *Storage {
	return &Storage{
		businesses: make(map[string]*Business),
		calls:      make(map[string]*Call),
	}
}

// AddBusiness adds a new business to storage
func (s *Storage) AddBusiness(business *Business) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.businesses[business.ID] = business
}

// GetBusiness retrieves a business by ID
func (s *Storage) GetBusiness(id string) (*Business, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	business, exists := s.businesses[id]
	if !exists {
		return nil, fmt.Errorf("business not found")
	}
	return business, nil
}

// GetAllBusinesses returns all registered businesses
func (s *Storage) GetAllBusinesses() []*Business {
	s.mu.RLock()
	defer s.mu.RUnlock()
	businesses := make([]*Business, 0, len(s.businesses))
	for _, business := range s.businesses {
		businesses = append(businesses, business)
	}
	return businesses
}

// AddCall adds a new call to storage
func (s *Storage) AddCall(call *Call) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.calls[call.ID] = call
}

// GetCall retrieves a call by ID
func (s *Storage) GetCall(id string) (*Call, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	call, exists := s.calls[id]
	if !exists {
		return nil, fmt.Errorf("call not found")
	}
	return call, nil
}

// UpdateCall updates an existing call
func (s *Storage) UpdateCall(call *Call) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, exists := s.calls[call.ID]; !exists {
		return fmt.Errorf("call not found")
	}
	s.calls[call.ID] = call
	return nil
}

// GetCallsByBusinessID retrieves all calls for a specific business
func (s *Storage) GetCallsByBusinessID(businessID string) []*Call {
	s.mu.RLock()
	defer s.mu.RUnlock()
	calls := make([]*Call, 0)
	for _, call := range s.calls {
		if call.BusinessID == businessID {
			calls = append(calls, call)
		}
	}
	return calls
}
