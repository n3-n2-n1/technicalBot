# AI Chat Platform

A full-stack application that integrates with various AI models via Ollama, featuring user authentication, real-time messaging, and persistent chat history.

## Features

- User registration and authentication with JWT
- Integration with Ollama models for AI chat
- Real-time messaging with Socket.io
- Redis caching for improved performance
- MongoDB for data persistence
- Responsive UI with Bootstrap

## Prerequisites

- Node.js (v14+)
- MongoDB
- Redis
- Ollama running on port 11434

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd ai-chat-platform
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Install frontend dependencies

```bash
cd ../frontend
npm install
```

### 4. Configure environment variables

Create a `.env` file in the backend directory:

```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/ai-chat-app
JWT_SECRET=your_jwt_secret_key_change_in_production
REDIS_URL=redis://localhost:6379
FRONTEND_URL=http://localhost:5173
OLLAMA_API_URL=http://localhost:11434
```

### 5. Start Ollama

Make sure Ollama is running and has at least one model available:

```bash
ollama run llama2
```

## Running the Application

### Start the backend

```bash
cd backend
npm run dev
```

### Start the frontend

```bash
cd frontend
npm run dev
```

The application will be available at `http://localhost:5173`

## Project Structure

- `/backend` - Express.js server, API routes, and database models
  - `/controllers` - Request handlers
  - `/middleware` - Authentication and other middleware
  - `/models` - MongoDB schemas
  - `/routes` - API routes
  - `/services` - Business logic and external service integrations

- `/frontend` - React application
  - `/components` - Reusable UI components
  - `/context` - React context for state management
  - `/pages` - Application pages/views
  - `/services` - API client services

## Technologies Used

### Backend
- Express.js - Web framework
- Socket.io - Real-time WebSocket communication
- MongoDB/Mongoose - Database and ORM
- Redis - Caching
- JSON Web Tokens - Authentication
- Bcrypt - Password hashing

### Frontend
- React - UI library
- React Router - Client-side routing
- Axios - HTTP client
- Socket.io Client - WebSocket client
- Bootstrap - CSS framework

## License

MIT 