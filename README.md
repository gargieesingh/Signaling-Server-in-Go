# WebRTC Video Chat Engine

A simple and clean WebRTC implementation using Go for signaling and web browsers for peer-to-peer communication. This project demonstrates a basic video chat application using WebRTC technology.

## Features

- Real-time video and audio communication
- Room-based peer-to-peer connections
- Simple and clean UI
- Toggle audio/video controls
- Written in Go (backend) and JavaScript (frontend)
- Uses Gorilla WebSocket for signaling
- Uses Pion WebRTC for WebRTC capabilities

## Project Structure

```
.
├── cmd/
│   └── server/
│       └── main.go           # Main server entry point
├── internal/
│   └── signaling/
│       └── server.go         # WebSocket signaling server implementation
├── web/
│   └── static/
│       ├── index.html        # Frontend UI
│       └── js/
│           └── webrtc.js     # WebRTC client implementation
├── go.mod                    # Go module file
└── README.md                 # This file
```

## Prerequisites

- Go 1.21 or later
- Modern web browser (Chrome, Firefox, etc.)
- Basic understanding of WebRTC concepts

## Setup Instructions

1. **Clone the Repository**

   ```bash
   git clone <repository-url>
   cd webrtc-engine
   ```

2. **Install Dependencies**

   ```bash
   go mod tidy
   ```

3. **Run the Server**

   ```bash
   go run cmd/server/main.go
   ```

   The server will start on port 8080 by default. You can specify a different port using the `-port` flag:

   ```bash
   go run cmd/server/main.go -port :3000
   ```

4. **Access the Application**
   - Open your web browser and navigate to `http://localhost:8080`
   - Enter a room ID and click "Join Room"
   - Open another browser window/tab with the same URL
   - Enter the same room ID in the second window
   - The video chat should establish automatically

## How It Works

### Signaling Server (Go)

1. **WebSocket Server**

   - Handles real-time communication between peers during the connection setup
   - Manages rooms and peer connections
   - Relays signaling messages (offers, answers, ICE candidates)

2. **Room Management**
   - Users can join rooms using a room ID
   - Server maintains a map of rooms and connected peers
   - Handles peer join/leave events

### Client-Side (JavaScript)

1. **WebRTC Setup**

   - Creates RTCPeerConnection with STUN server configuration
   - Handles local media stream acquisition
   - Manages WebSocket connection for signaling

2. **Signaling Process**

   - Exchange of offers/answers between peers
   - ICE candidate exchange
   - Connection establishment and management

3. **Media Handling**
   - Local and remote video stream management
   - Audio/video toggle functionality
   - Error handling for media devices

## Implementation Details

### Backend (Go)

The backend is implemented using the following components:

1. **Main Server (`cmd/server/main.go`)**

   - HTTP server setup
   - Static file serving
   - WebSocket endpoint registration

2. **Signaling Server (`internal/signaling/server.go`)**
   - WebSocket connection management
   - Room and peer tracking
   - Message relay system
   - Connection state management

### Frontend (JavaScript)

The frontend implementation includes:

1. **WebRTC Connection Management**

   - Peer connection creation and configuration
   - Media stream handling
   - ICE candidate processing
   - Offer/Answer exchange

2. **User Interface**
   - Video elements for local and remote streams
   - Room joining interface
   - Media control buttons

## Error Handling

The implementation includes error handling for:

- Failed WebSocket connections
- Media device access issues
- Peer connection failures
- ICE candidate errors

## Limitations

- Supports only two peers per room
- Uses basic STUN server (Google's public STUN server)
- No authentication/authorization
- No data channel implementation
- Basic error handling

## Future Improvements

1. Multi-peer support in rooms
2. Custom STUN/TURN server implementation
3. Authentication system
4. Data channel for text chat
5. Screen sharing capability
6. Recording functionality
7. Room persistence
8. Better error handling and recovery
9. Network quality indicators
10. Bandwidth adaptation

## Contributing

Feel free to submit issues, fork the repository, and create pull requests for any improvements.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
