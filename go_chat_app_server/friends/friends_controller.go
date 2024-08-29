package friends

import (
	"github.com/gin-gonic/gin"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"net/http"
	"go_chat_app_server/users"
)


type FriendsController struct {
    Driver neo4j.Driver
}

func (c *FriendsController) AddFriend(context *gin.Context) {
	userID := context.Param("user_id")
	var friendRequest struct {
		Email string `json:"email"`
	}

	if err := context.ShouldBindJSON(&friendRequest); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	session := c.Driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close()

	_, err := session.WriteTransaction(func(tx neo4j.Transaction) (interface{}, error) {
		query := `
			MATCH (u:User {id: $userID}), (f:User {email: $friendEmail})
			CREATE (u)-[:FRIENDS_WITH]->(f),
			   (f)-[:FRIENDS_WITH]->(u)
			RETURN f`
		parameters := map[string]interface{}{
			"userID":      userID,
			"friendEmail": friendRequest.Email,
		}
		_, err := tx.Run(query, parameters)
		return nil, err
	})

	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add friend"})
		return
	}

	context.JSON(http.StatusOK, gin.H{
		"message":     "Friend added successfully",
		"user_id":     userID,
		"friend_email": friendRequest.Email,
	})
}

func (c *FriendsController) GetFriends(context *gin.Context) {
	userID := context.Param("user_id")

	session := c.Driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close()

	result, err := session.ReadTransaction(func(tx neo4j.Transaction) (interface{}, error) {
		query := `
			MATCH (u:User {id: $userID})-[:FRIENDS_WITH]->(f:User)
			RETURN f.id, f.name, f.email`
		parameters := map[string]interface{}{
			"userID": userID,
		}
		records, err := tx.Run(query, parameters)
		if err != nil {
			return nil, err
		}

		var friends []users.User
		for records.Next() {
			record := records.Record()
			friend := users.User{
				ID:    record.Values[0].(string),
				Name:  record.Values[1].(string),
				Email: record.Values[2].(string),
			}
			friends = append(friends, friend)
		}

		if friends == nil {
			friends = []users.User{}
		}

		return friends, nil
	})

	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get friends"})
		return
	}

	context.JSON(http.StatusOK, result)
}

func (c *FriendsController) GetFriend(context *gin.Context) {
	userID := context.Param("user_id")
	friendID := context.Param("friend_id")

	session := c.Driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close()

	result, err := session.ReadTransaction(func(tx neo4j.Transaction) (interface{}, error) {
		query := `
            MATCH (u:User {id: $userID})-[:FRIENDS_WITH]->(f:User {id: $friendID})
            RETURN f.id, f.name, f.email`
		parameters := map[string]interface{}{
			"userID":   userID,
			"friendID": friendID,
		}
		record, err := tx.Run(query, parameters)
		if err != nil {
			return nil, err
		}

		if record.Next() {
			friend := users.User{
				ID:    record.Record().Values[0].(string),
				Name:  record.Record().Values[1].(string),
				Email: record.Record().Values[2].(string),
			}
			return friend, nil
		}

		return nil, nil
	})

	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get friend details"})
		return
	}

	if result == nil {
		context.JSON(http.StatusNotFound, gin.H{"error": "Friend not found"})
		return
	}

	context.JSON(http.StatusOK, result)
}
