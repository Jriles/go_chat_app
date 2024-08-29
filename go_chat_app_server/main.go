package main

import (
	"github.com/gin-gonic/gin"
	"github.com/gin-contrib/cors"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"log"
	"go_chat_app_server/users"
	"go_chat_app_server/friends"
	"go_chat_app_server/messages"
	"go_chat_app_server/sockets"
	"go_chat_app_server/middleware"
)

var (
	driver      neo4j.Driver
	hub         = sockets.NewHub()
)

// set up db driver/connection, init controllers with db driver, init router
func main() {
	var err error
	driver, err = neo4j.NewDriver("neo4j://chat-app-neo4j-db:7687", neo4j.BasicAuth("neo4j", "password", ""))
	if err != nil {
		log.Fatal(err)
	}
	defer driver.Close()
	usersController := users.UsersController { Driver: driver, Hub: hub }
	friendsController := friends.FriendsController { Driver: driver }

	go hub.Run()
	messagesController := messages.MessagesController { Driver: driver, Hub: hub }

	router := gin.Default()
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept"},
	}))
	router.Use(middleware.WithDriver(driver))
	router.POST("/users", usersController.CreateUser)
	router.GET("/users/:user_id/status", usersController.GetUserStatus)
	router.POST("/users/:user_id/friends", friendsController.AddFriend)
	router.GET("/users/:user_id/friends", friendsController.GetFriends)
	router.GET("/ws/:user_id/friends/:friend_id", messagesController.ChatWebSocket)
	router.GET("/users/:user_id/friends/:friend_id", friendsController.GetFriend)
	router.GET("/users/:user_id/friends/:friend_id/messages", messagesController.GetChatMessages)
	router.GET("/users/email/:email", usersController.GetUserByEmail)
	router.Run("0.0.0.0:8080")
}
