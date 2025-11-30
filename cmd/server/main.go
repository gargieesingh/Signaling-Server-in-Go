package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"webrtc-engine/internal/signaling"
)

func main() {
	// Get port from environment variable or use default
	port := os.Getenv("PORT")
	if port == "" {
		port = "5050" // Default port
	}

	// Create new signaling server
	signalingServer := signaling.NewServer()

	// Serve static files
	http.Handle("/", http.FileServer(http.Dir("web/static")))

	// WebSocket endpoint
	http.HandleFunc("/ws", signalingServer.HandleWebSocket)

	addr := fmt.Sprintf(":%s", port)
	log.Printf("Starting server on port %s", port)
	
	server := &http.Server{
		Addr:    addr,
		Handler: nil,
	}
	
	if err := server.ListenAndServe(); err != nil {
		log.Fatal("Failed to start server: ", err)
	}
}

// run the server with: go run cmd/server/main.go