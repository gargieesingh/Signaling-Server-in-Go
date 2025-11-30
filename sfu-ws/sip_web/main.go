package main

import (
	"log"
	"net/http"
)

func main() {
	server := NewServer()

	// API routes
	http.HandleFunc("/api/business/register", enableCORS(server.RegisterBusiness))
	http.HandleFunc("/api/business/list", enableCORS(server.ListBusinesses))
	http.HandleFunc("/api/call/initiate", enableCORS(server.InitiateCall))
	http.HandleFunc("/api/call/status", enableCORS(server.GetCallStatus))
	http.HandleFunc("/api/call/history", enableCORS(server.GetCallHistory))

	// Serve static files
	fs := http.FileServer(http.Dir("./static"))
	http.Handle("/", fs)

	log.Println("Server starting on http://localhost:8080")
	log.Println("API endpoints:")
	log.Println("  POST   /api/business/register")
	log.Println("  GET    /api/business/list")
	log.Println("  POST   /api/call/initiate")
	log.Println("  GET    /api/call/status?id={callId}")
	log.Println("  GET    /api/call/history?business_id={businessId}")
	
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal(err)
	}
}
