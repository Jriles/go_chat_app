# Use a Go 1.21 image
FROM golang:1.21-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy go.mod and go.sum for efficient dependency management
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy the rest of the application code
COPY . .

# Build the executable
RUN go build -o main .

# Expose the port your server will listen on
EXPOSE 8080

# Command to run when the container starts
CMD ["./main"]
