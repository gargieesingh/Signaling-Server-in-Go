package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"strings"
	"webrtc-engine/internal/signaling"
)

func main() {
	defaultPort := 8080
	port := flag.Int("port", defaultPort, "port to run the server on")
	flag.Parse()

	// Create new signaling server
	signalingServer := signaling.NewServer()

	// Serve static files
	http.Handle("/", http.FileServer(http.Dir("web/static")))

	// WebSocket endpoint
	http.HandleFunc("/ws", signalingServer.HandleWebSocket)

	// Try ports until we find an available one
	var err error
	currentPort := *port
	for attempts := 0; attempts < 10; attempts++ {
		addr := fmt.Sprintf(":%d", currentPort)
		log.Printf("Attempting to start server on port %d", currentPort)
		
		server := &http.Server{
			Addr:    addr,
			Handler: nil,
		}
		
		err = server.ListenAndServe()
		if err != nil && strings.Contains(err.Error(), "bind: address already in use") {
			currentPort++
			continue
		}
		break
	}
	
	if err != nil {
		log.Fatal("Failed to start server: ", err)
	}
}