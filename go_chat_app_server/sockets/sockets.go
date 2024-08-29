package sockets

import (
	"github.com/gorilla/websocket"
	"sync"
	"fmt"
)

// Hub structure to manage WebSocket connections and broadcast messages
type Hub struct {
	clients    map[*websocket.Conn]bool
	UserStatus map[string]bool
	broadcast  chan []byte
	Register   chan *websocket.Conn
	Unregister chan *websocket.Conn
	clientsMu     sync.Mutex // Separate mutex for clients
	userStatusMu  sync.Mutex // Separate mutex for user status
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*websocket.Conn]bool),
		UserStatus: make(map[string]bool),
		broadcast:  make(chan []byte),
		Register:   make(chan *websocket.Conn),
		Unregister: make(chan *websocket.Conn),
	}
}

func (h *Hub) Run() {
    for {
        select {
        case conn := <-h.Register:
            h.clientsMu.Lock()
            h.clients[conn] = true
            h.clientsMu.Unlock()

        case conn := <-h.Unregister:
            h.clientsMu.Lock()
            if _, ok := h.clients[conn]; ok {
                delete(h.clients, conn)
                conn.Close()
            }

            h.clientsMu.Unlock()

        case message := <-h.broadcast:
            h.clientsMu.Lock()
            for conn := range h.clients {
                err := conn.WriteMessage(websocket.TextMessage, message)
                if err != nil {
                    conn.Close()
                    delete(h.clients, conn)
                }
            }
            h.clientsMu.Unlock()
        }
    }
}

func (h *Hub) BroadcastStatus(userID string, status string) {
    h.userStatusMu.Lock()
    defer h.userStatusMu.Unlock()

    // Update the user's status
    if status == "online" {
        h.UserStatus[userID] = true
    } else if status == "offline" {
        h.UserStatus[userID] = false
    }

    // Broadcast the new status to all connected clients
    message := fmt.Sprintf(`{"userID": "%s", "status": "%s"}`, userID, status)
    h.broadcast <- []byte(message)
}
