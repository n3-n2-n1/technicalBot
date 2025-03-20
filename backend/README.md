# AI Chat Platform - Backend

## Architecture Overview

The backend of the AI Chat Platform is built with Node.js and Express.js, following a modern modular architecture pattern:

```
backend/
├── controllers/      # Request handlers
├── middleware/       # Auth and utility middleware
├── models/           # Mongoose data models
├── routes/           # API route definitions
├── services/         # Business logic & external API integration
└── server.js         # Main application entry point
```

## Technical Stack

- **Express.js**: Web server framework
- **MongoDB/Mongoose**: Database with ODM
- **Socket.io**: Real-time bidirectional communication
- **JWT**: Token-based authentication
- **Redis**: Caching layer for improved performance
- **Axios**: HTTP client for external API calls
- **Bcrypt**: Secure password hashing

## API Endpoints

### Authentication

- `POST /api/auth/register` - Create a new user account
- `POST /api/auth/login` - Authenticate a user and receive JWT
- `GET /api/auth/profile` - Get the current user's profile (protected)

### AI & Chat

- `GET /api/ai/models` - List available AI models
- `POST /api/ai/chats` - Create a new chat session
- `GET /api/ai/chats` - List all chats for the current user
- `GET /api/ai/chats/:chatId` - Get details of a specific chat
- `POST /api/ai/chats/:chatId/messages` - Send a message in a chat
- `DELETE /api/ai/chats/:chatId` - Delete a chat

## Real-time Communication

The application implements real-time messaging using Socket.io with the following events:

- `join-chat`: Join a specific chat room
- `leave-chat`: Leave a chat room
- `chat-message`: Send a message to a chat room
- `message`: Receive messages in a chat room

All socket connections are authenticated using JWT tokens.

## Data Models

### User

- `username`: String (unique)
- `email`: String (unique)
- `password`: String (hashed)
- `createdAt`: Date

### Chat

- `title`: String
- `user`: ObjectId (reference to User)
- `messages`: Array of message objects
- `createdAt`: Date
- `updatedAt`: Date

## Design Decisions

### Modular Architecture

The backend follows a clean separation of concerns:
- **Routes**: Define API endpoints and connect them to controllers
- **Controllers**: Handle HTTP requests and responses
- **Services**: Contain business logic and external API interactions
- **Models**: Define data structure and database interactions

### Authentication Strategy

We use JWT (JSON Web Tokens) for stateless authentication:
- Tokens are issued on login and stored client-side
- Each protected request includes the token in the Authorization header
- The authenticate middleware validates tokens before allowing access to protected resources
- Socket connections are also authenticated using the same JWT strategy

### External AI Integration

Integration with Ollama:
- The AI service communicates with Ollama's API for text generation
- API calls are made with Axios
- Streaming responses are supported through Socket.io for real-time interaction

### Caching Strategy

Redis is used to cache:
- Available AI models to reduce load on the Ollama API
- Frequent user queries to improve response times
- Session data for faster authentication

## Environment Configuration

Required environment variables:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/ai-chat-app
JWT_SECRET=your_jwt_secret_key_change_in_production
REDIS_URL=redis://localhost:6379
FRONTEND_URL=http://localhost:5173
OLLAMA_API_URL=http://localhost:11434
```

## Development

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Run tests (when implemented):
```bash
npm test
```

## Production Deployment

For production deployment:

1. Set appropriate environment variables
2. Consider using a process manager like PM2
3. Implement proper logging and monitoring
4. Set up a reverse proxy with Nginx or similar 