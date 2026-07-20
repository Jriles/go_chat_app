# Real Time Chat Application
## Hi! Thanks for checking out my project! 

The purpose of this project is to showcase my ability to write and organize go and manage things like sockets, controllers, queries, etc.

### Prerequisites

Make sure you have the following installed:

- [Git](https://git-scm.com/)
- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Installation

1. **Clone the repository**:

    ```bash
    git clone https://github.com/jriles/go_chat_app.git
    ```

2. **Navigate into the project directory**:

    ```bash
    cd go_chat_app
    ```

3. **Run the application**:

    ```bash
    docker-compose up
    ```

### Access the Application

Once Docker Compose has started all services, which can take about 30 seconds, you can access the application by navigating to `http://localhost:3000` in your web browser. More instructions await you there on how to start chatting.

### Shutting Down

To stop the application, press `Ctrl + C` from the project directory.

### Features

- **Real-time messaging** over WebSockets, with optional persistence to a Neo4j graph database.
- **Multi-media file sharing** — upload images, videos, or any other file type from the chat view. Files are uploaded over HTTP, stored on the server, and broadcast to the other user's socket connection in real time. Images render as inline previews and videos autoplay muted; other file types render as a download link.
- **Multi-device / LAN support** — the frontend resolves the API and WebSocket server from the hostname it was loaded from, so the same build works whether you're on `localhost` or accessing it from another device on the same network.
