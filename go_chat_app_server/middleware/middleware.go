package middleware

import (
    "github.com/gin-gonic/gin"
    "github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

func WithDriver(driver neo4j.Driver) gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Set("neo4jDriver", driver)
        c.Next()
    }
}
