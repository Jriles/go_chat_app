package users

import (
	"github.com/gin-gonic/gin"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"github.com/google/uuid"
	"net/http"
	"go_chat_app_server/sockets"
)

type UsersController struct {
    Driver neo4j.Driver
    Hub *sockets.Hub
}

func (c *UsersController) CreateUser(context *gin.Context) {

	session := c.Driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close()

	var user User
	if err := context.ShouldBindJSON(&user); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user.ID = uuid.New().String()

	_, err := session.WriteTransaction(func(tx neo4j.Transaction) (interface{}, error) {
		query := "CREATE (u:User {id: $id, name: $name, email: $email}) RETURN u"
		parameters := map[string]interface{}{
			"id":    user.ID,
			"name":  user.Name,
			"email": user.Email,
		}
		_, err := tx.Run(query, parameters)
		return nil, err
	})

	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	context.JSON(http.StatusCreated, user)
}

func (c *UsersController) GetUserByEmail(context *gin.Context) {
	email := context.Param("email")

	session := c.Driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close()

	result, err := session.ReadTransaction(func(tx neo4j.Transaction) (interface{}, error) {
		query := `
		    MATCH (u:User {email: $email})
		    RETURN u.id, u.name, u.email
		`
		parameters := map[string]interface{}{
			"email": email,
		}
		record, err := tx.Run(query, parameters)
		if err != nil {
			return nil, err
		}

		if record.Next() {
			user := User{
				ID:    record.Record().Values[0].(string),
				Name:  record.Record().Values[1].(string),
				Email: record.Record().Values[2].(string),
			}
			return user, nil
		}

		return nil, nil
	})

	if err != nil {
		context.JSON(http.StatusInternalServerError, err)
		return
	}

	if result == nil {
		context.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	context.JSON(http.StatusOK, result)
}

func (c *UsersController) GetUserStatus(context *gin.Context) {
    userID := context.Param("user_id")

    isOnline, exists := c.Hub.UserStatus[userID]
    if !exists || !isOnline {
        context.JSON(http.StatusOK, gin.H{"status": "offline"})
    } else {
        context.JSON(http.StatusOK, gin.H{"status": "online"})
    }
}
