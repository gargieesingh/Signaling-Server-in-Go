package signaling

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

type Client struct {
	conn     *websocket.Conn
	server   *Server
	roomID   string
	peerID   string
	sendChan chan []byte
}

type Message struct {
	Type    string          `json:"type"`
	RoomID  string          `json:"roomId"`
	PeerID  string          `json:"peerId"`
	Payload json.RawMessage `json:"payload"`
}

type Server struct {
	upgrader websocket.Upgrader
	clients  map[string]map[string]*Client // roomID -> peerID -> client
	mutex    sync.RWMutex
}

func NewServer() *Server {
	return &Server{
		upgrader: websocket.Upgrader{
			CheckOrigin: func(_ *http.Request) bool { return true },
		},
		clients: make(map[string]map[string]*Client),
	}
}

func (s *Server) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := s.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Websocket upgrade failed: %v", err)
		return
	}

	client := &Client{
		conn:     conn,
		server:   s,
		sendChan: make(chan []byte, 256),
	}

	go client.writePump()
	go client.readPump()
}

func (c *Client) readPump() {
	defer func() {
		c.conn.Close()
		c.server.removeClient(c)
	}()

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("Error reading message: %v", err)
			}
			break
		}

		var msg Message
		if err := json.Unmarshal(message, &msg); err != nil {
			log.Printf("Error unmarshaling message: %v", err)
			continue
		}

		c.handleMessage(msg)
	}
}

func (c *Client) writePump() {
	defer c.conn.Close()

	for message := range c.sendChan {
		if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
			log.Printf("Error writing message: %v", err)
			break
		}
	}
}

func (c *Client) handleMessage(msg Message) {
	log.Printf("Handling message type: %s from peer: %s in room: %s", msg.Type, msg.PeerID, msg.RoomID)
	
	switch msg.Type {
	case "join":
		c.roomID = msg.RoomID
		c.peerID = msg.PeerID
		c.server.addClient(c)
		log.Printf("Client %s joined room %s", c.peerID, c.roomID)

	case "offer":
		log.Printf("Relaying offer from peer %s in room %s", msg.PeerID, msg.RoomID)
		c.server.relayMessage(msg)

	case "answer":
		log.Printf("Relaying answer from peer %s in room %s", msg.PeerID, msg.RoomID)
		c.server.relayMessage(msg)

	case "ice-candidate":
		log.Printf("Relaying ICE candidate from peer %s in room %s", msg.PeerID, msg.RoomID)
		c.server.relayMessage(msg)
	}
}

func (s *Server) addClient(client *Client) {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	if _, exists := s.clients[client.roomID]; !exists {
		s.clients[client.roomID] = make(map[string]*Client)
	}
	s.clients[client.roomID][client.peerID] = client

	log.Printf("Client %s joined room %s", client.peerID, client.roomID)

	// Notify all peers about each other
	for peerID, peer := range s.clients[client.roomID] {
		if peerID != client.peerID {
			// Notify existing peer about new peer
			msg1 := Message{
				Type:   "peer-joined",
				RoomID: client.roomID,
				PeerID: client.peerID,
			}
			if data, err := json.Marshal(msg1); err == nil {
				log.Printf("Notifying peer %s about new peer %s", peerID, client.peerID)
				peer.sendChan <- data
			}

			// Notify new peer about existing peer
			msg2 := Message{
				Type:   "peer-joined",
				RoomID: client.roomID,
				PeerID: peerID,
			}
			if data, err := json.Marshal(msg2); err == nil {
				log.Printf("Notifying new peer %s about existing peer %s", client.peerID, peerID)
				client.sendChan <- data
			}
		}
	}
}

func (s *Server) removeClient(client *Client) {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	if room, exists := s.clients[client.roomID]; exists {
		delete(room, client.peerID)
		if len(room) == 0 {
			delete(s.clients, client.roomID)
		}

		// Notify other peers about departure
		for _, peer := range room {
			msg := Message{
				Type:   "peer-left",
				RoomID: client.roomID,
				PeerID: client.peerID,
			}
			if data, err := json.Marshal(msg); err == nil {
				peer.sendChan <- data
			}
		}
	}
}

func (s *Server) relayMessage(msg Message) {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	if room, exists := s.clients[msg.RoomID]; exists {
		log.Printf("Relaying message type %s from peer %s in room %s", msg.Type, msg.PeerID, msg.RoomID)
		
		switch msg.Type {
		case "offer", "answer":
			// For offer/answer, send to the specific peer
			if targetPeer, exists := room[msg.PeerID]; exists {
				// The message sender's ID will be in the connection context
				senderID := ""
				for peerID, peer := range room {
					if peer != targetPeer {
						senderID = peerID
						break
					}
				}
				
				outMsg := Message{
					Type:    msg.Type,
					RoomID:  msg.RoomID,
					PeerID:  senderID,  // Set the sender's ID
					Payload: msg.Payload,
				}

				if data, err := json.Marshal(outMsg); err == nil {
					log.Printf("Sending %s from peer %s to peer %s", msg.Type, senderID, msg.PeerID)
					targetPeer.sendChan <- data
				} else {
					log.Printf("Error marshaling message: %v", err)
				}
			}
			
		case "ice-candidate":
			// Send ICE candidates to all other peers
			for targetPeerID, targetPeer := range room {
				if targetPeerID != msg.PeerID {
					outMsg := Message{
						Type:    msg.Type,
						RoomID:  msg.RoomID,
						PeerID:  msg.PeerID,
						Payload: msg.Payload,
					}

					if data, err := json.Marshal(outMsg); err == nil {
						log.Printf("Sending ICE candidate from peer %s to peer %s", msg.PeerID, targetPeerID)
						targetPeer.sendChan <- data
					}
				}
			}
		}
	} else {
		log.Printf("Room %s not found for message relay", msg.RoomID)
	}
}