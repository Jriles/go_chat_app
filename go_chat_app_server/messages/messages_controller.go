package messages

import (
	"github.com/gin-gonic/gin"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"github.com/google/uuid"
	"net/http"
	"github.com/gorilla/websocket"
	"log"
	"fmt"
	"os"
	"path/filepath"
	"time"
	"encoding/json"
	"go_chat_app_server/sockets"
)

type MessagesController struct {
    Driver neo4j.Driver
    Hub *sockets.Hub
}

const uploadDir = "./uploads"

var (
	upgrader    = websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}
	connections = make(map[string]*websocket.Conn)

)

func (c *MessagesController) ChatWebSocket(context *gin.Context) {
	userID := context.Param("user_id")
	friendID := context.Param("friend_id")

	conn, err := upgrader.Upgrade(context.Writer, context.Request, nil)
	if err != nil {
		log.Println("Failed to set websocket upgrade:", err)
		return
	}
	defer conn.Close()

	c.Hub.Register <- conn
	defer func() { c.Hub.Unregister <- conn }()

	connectionKey := fmt.Sprintf("%s-%s", userID, friendID)
	connections[connectionKey] = conn


	_, exists := c.Hub.UserStatus[userID]
	if !exists {
	    c.Hub.UserStatus[userID] = true
	    c.Hub.BroadcastStatus(userID, "online")
	}

	for {
		_, messageBytes, err := conn.ReadMessage()
		if err != nil {
			log.Println("Read error:", err)
			break
		}

		// Unmarshal the JSON message into a ChatMessage struct
		var chatMessage ChatMessage
		err = json.Unmarshal(messageBytes, &chatMessage)
		if err != nil {
			log.Println("Unmarshal error:", err)
			continue
		}

		// Broadcast the message to the friend
		if friendConn, ok := connections[fmt.Sprintf("%s-%s", friendID, userID)]; ok {
		    msgJson := fmt.Sprintf(`{"content": "%s"}`, chatMessage.Content)
		    err = friendConn.WriteMessage(websocket.TextMessage, []byte(msgJson))
		    if err != nil {
			    log.Println("Write error:", err)
			    break
		    }
		}

		// Persist the message after broadcasting
		if chatMessage.Persist {
			err = c.PersistChatMessage(userID, friendID, chatMessage.Content)
			if err != nil {
				log.Println("Error persisting chat message:", err)
			}
		}
	}

	// When the loop breaks, it means the WebSocket connection is closed
	// we want to cleanup the disconnected socket resources and publish
	// the disconnect
	delete(connections, connectionKey)
	c.Hub.Unregister <- conn
	c.Hub.BroadcastStatus(userID, "offline")
	// remove the person from the UserStatus Map
	delete(c.Hub.UserStatus, userID)
}

func (c *MessagesController) PersistChatMessage(userID, friendID, content string) error {

	session := c.Driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close()

	_, err := session.WriteTransaction(func(tx neo4j.Transaction) (interface{}, error) {
		query := `
		    MATCH (u:User {id: $userID}), (f:User {id: $friendID})
		    CREATE (u)-[:SENT]->(m:Message {type: "text", content: $content, timestamp: timestamp()}),
			   (m)-[:RECEIVED_BY]->(f)
		    RETURN m`
		parameters := map[string]interface{}{
			"userID":   userID,
			"friendID": friendID,
			"content":  content,
		}
		_, err := tx.Run(query, parameters)
		if err != nil {
			log.Printf("Error running transaction to persist chat message. UserID: %s, FriendID: %s, Content: %s, Error: %v", userID, friendID, content, err)
		}
		return nil, err
	})

	if err != nil {
		log.Printf("Failed to persist chat message for UserID: %s, FriendID: %s, Content: %s, Error: %v", userID, friendID, content, err)
	}

	return err
}

func (c *MessagesController) PersistChatFileMessage(userID, friendID, fileURL, fileName, mimeType string) error {

	session := c.Driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close()

	_, err := session.WriteTransaction(func(tx neo4j.Transaction) (interface{}, error) {
		query := `
		    MATCH (u:User {id: $userID}), (f:User {id: $friendID})
		    CREATE (u)-[:SENT]->(m:Message {type: "file", fileUrl: $fileUrl, fileName: $fileName, mimeType: $mimeType, timestamp: timestamp()}),
			   (m)-[:RECEIVED_BY]->(f)
		    RETURN m`
		parameters := map[string]interface{}{
			"userID":   userID,
			"friendID": friendID,
			"fileUrl":  fileURL,
			"fileName": fileName,
			"mimeType": mimeType,
		}
		_, err := tx.Run(query, parameters)
		if err != nil {
			log.Printf("Error running transaction to persist chat file message. UserID: %s, FriendID: %s, FileUrl: %s, Error: %v", userID, friendID, fileURL, err)
		}
		return nil, err
	})

	if err != nil {
		log.Printf("Failed to persist chat file message for UserID: %s, FriendID: %s, FileUrl: %s, Error: %v", userID, friendID, fileURL, err)
	}

	return err
}

// UploadFile saves an uploaded file to disk, optionally persists it as a chat
// message, and broadcasts it in real time to the friend if they are connected.
func (c *MessagesController) UploadFile(context *gin.Context) {
	userID := context.Param("user_id")
	friendID := context.Param("friend_id")

	fileHeader, err := context.FormFile("file")
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"error": "file is required"})
		return
	}

	if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
		log.Println("Failed to create upload directory:", err)
		context.JSON(http.StatusInternalServerError, gin.H{"error": "failed to prepare upload directory"})
		return
	}

	storedName := fmt.Sprintf("%s%s", uuid.New().String(), filepath.Ext(fileHeader.Filename))
	destPath := filepath.Join(uploadDir, storedName)

	if err := context.SaveUploadedFile(fileHeader, destPath); err != nil {
		log.Println("Failed to save uploaded file:", err)
		context.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save file"})
		return
	}

	mimeType := fileHeader.Header.Get("Content-Type")
	fileURL := fmt.Sprintf("/uploads/%s", storedName)
	timestamp := time.Now().Format(time.RFC3339)

	if context.PostForm("persist") == "true" {
		if err := c.PersistChatFileMessage(userID, friendID, fileURL, fileHeader.Filename, mimeType); err != nil {
			log.Println("Error persisting chat file message:", err)
		}
	}

	if friendConn, ok := connections[fmt.Sprintf("%s-%s", friendID, userID)]; ok {
		payload := FileMessage{
			Type:      "file",
			FileUrl:   fileURL,
			FileName:  fileHeader.Filename,
			MimeType:  mimeType,
			Timestamp: timestamp,
		}
		msgJson, err := json.Marshal(payload)
		if err != nil {
			log.Println("Marshal error:", err)
		} else if err := friendConn.WriteMessage(websocket.TextMessage, msgJson); err != nil {
			log.Println("Write error:", err)
		}
	}

	context.JSON(http.StatusOK, gin.H{
		"fileUrl":   fileURL,
		"fileName":  fileHeader.Filename,
		"mimeType":  mimeType,
		"timestamp": timestamp,
	})
}

// messageNodeToMap converts a Message node into a JSON-friendly map. Older
// nodes were written without a "type" property, so it defaults to "text";
// file-message properties are included only when present.
func messageNodeToMap(node neo4j.Node) map[string]interface{} {
	msgType, ok := node.Props["type"].(string)
	if !ok || msgType == "" {
		msgType = "text"
	}

	result := map[string]interface{}{
		"type":      msgType,
		"timestamp": node.Props["timestamp"].(int64),
	}

	if content, ok := node.Props["content"].(string); ok {
		result["content"] = content
	}
	if fileUrl, ok := node.Props["fileUrl"].(string); ok {
		result["fileUrl"] = fileUrl
	}
	if fileName, ok := node.Props["fileName"].(string); ok {
		result["fileName"] = fileName
	}
	if mimeType, ok := node.Props["mimeType"].(string); ok {
		result["mimeType"] = mimeType
	}

	return result
}

func (c *MessagesController) GetChatMessages(context *gin.Context) {
	userID := context.Param("user_id")
	friendID := context.Param("friend_id")

	// Declare slices to hold message objects
	var sentMessages []map[string]interface{} = make([]map[string]interface{}, 0)
	var receivedMessages []map[string]interface{} = make([]map[string]interface{}, 0)

	session := c.Driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close()

	_, err := session.ReadTransaction(func(tx neo4j.Transaction) (interface{}, error) {
		query := `
            OPTIONAL MATCH (u:User {id: $userID})-[:SENT]->(m:Message)-[:RECEIVED_BY]->(f:User {id: $friendID})
	    WITH collect(m) as sentMessages
            OPTIONAL MATCH (f:User {id: $friendID})-[:SENT]->(fm:Message)-[:RECEIVED_BY]->(u:User {id: $userID})
            RETURN sentMessages, collect(fm) as receivedMessages`
		parameters := map[string]interface{}{
			"userID":   userID,
			"friendID": friendID,
		}
		records, err := tx.Run(query, parameters)
		if err != nil {
			return nil, err
		}

		if records.Next() {
			record := records.Record()

			sentMessagesList, _ := record.Get("sentMessages")
			if sentMessagesList != nil {
				for _, msg := range sentMessagesList.([]interface{}) {
					sentMessages = append(sentMessages, messageNodeToMap(msg.(neo4j.Node)))
				}
			}

			receivedMessagesList, _ := record.Get("receivedMessages")
			if receivedMessagesList != nil {
				for _, msg := range receivedMessagesList.([]interface{}) {
					receivedMessages = append(receivedMessages, messageNodeToMap(msg.(neo4j.Node)))
				}
			}
		}

		return map[string][]map[string]interface{}{
			"sentMessages":    sentMessages,
			"receivedMessages": receivedMessages,
		}, nil
	})

	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get chat messages"})
		return
	}

	context.JSON(http.StatusOK, map[string][]map[string]interface{}{
		"sentMessages":    sentMessages,
		"receivedMessages": receivedMessages,
	})
}
