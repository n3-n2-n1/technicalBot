# AI Chat Platform - API Documentation

This document outlines the REST API endpoints for the AI Chat Platform, providing details on request/response formats, authentication requirements, and usage examples.

## OpenAPI Specification

```yaml
openapi: 3.0.0
info:
  title: AI Chat Platform API
  description: REST API for interacting with the AI Chat Platform
  version: 1.0.0

servers:
  - url: http://localhost:3000/api
    description: Development server

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    User:
      type: object
      properties:
        id:
          type: string
          description: Unique identifier
        username:
          type: string
          description: User's display name
        email:
          type: string
          format: email
          description: User's email address
        createdAt:
          type: string
          format: date-time
          description: Account creation timestamp
      required:
        - id
        - username
        - email
    
    Chat:
      type: object
      properties:
        id:
          type: string
          description: Unique identifier
        title:
          type: string
          description: Title of the chat
        user:
          type: string
          description: ID of the user who owns this chat
        messages:
          type: array
          items:
            $ref: '#/components/schemas/Message'
        createdAt:
          type: string
          format: date-time
          description: Chat creation timestamp
        updatedAt:
          type: string
          format: date-time
          description: Last update timestamp
      required:
        - id
        - title
        - user
    
    Message:
      type: object
      properties:
        id:
          type: string
          description: Unique identifier
        content:
          type: string
          description: Message content
        sender:
          type: string
          enum: ['user', 'ai']
          description: Who sent the message
        timestamp:
          type: string
          format: date-time
          description: Message timestamp
      required:
        - id
        - content
        - sender
        - timestamp
    
    Model:
      type: object
      properties:
        id:
          type: string
          description: Model identifier
        name:
          type: string
          description: Display name of the model
        description:
          type: string
          description: Brief description of the model
      required:
        - id
        - name
    
    Error:
      type: object
      properties:
        code:
          type: integer
          description: HTTP status code
        message:
          type: string
          description: Error message
        details:
          type: object
          description: Additional error details
      required:
        - code
        - message

paths:
  /auth/register:
    post:
      summary: Register a new user
      description: Create a new user account
      tags:
        - Authentication
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                username:
                  type: string
                  minLength: 3
                  maxLength: 30
                email:
                  type: string
                  format: email
                password:
                  type: string
                  minLength: 8
              required:
                - username
                - email
                - password
      responses:
        '201':
          description: User successfully created
          content:
            application/json:
              schema:
                type: object
                properties:
                  user:
                    $ref: '#/components/schemas/User'
                  token:
                    type: string
                    description: JWT token for authentication
        '400':
          description: Invalid input
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '409':
          description: Username or email already exists
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /auth/login:
    post:
      summary: Authenticate user
      description: Login with existing user credentials
      tags:
        - Authentication
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                email:
                  type: string
                  format: email
                password:
                  type: string
              required:
                - email
                - password
      responses:
        '200':
          description: Authentication successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  user:
                    $ref: '#/components/schemas/User'
                  token:
                    type: string
                    description: JWT token for authentication
        '401':
          description: Invalid credentials
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /auth/profile:
    get:
      summary: Get user profile
      description: Retrieve the current user's profile information
      tags:
        - Authentication
      security:
        - BearerAuth: []
      responses:
        '200':
          description: User profile retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '401':
          description: Unauthorized
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /ai/models:
    get:
      summary: List available AI models
      description: Get a list of available AI models for chat
      tags:
        - AI
      security:
        - BearerAuth: []
      responses:
        '200':
          description: List of models retrieved successfully
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Model'
        '401':
          description: Unauthorized
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /ai/chats:
    post:
      summary: Create a new chat
      description: Initialize a new chat session
      tags:
        - Chat
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                title:
                  type: string
                  description: Chat title
                modelId:
                  type: string
                  description: ID of the AI model to use
              required:
                - title
                - modelId
      responses:
        '201':
          description: Chat created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Chat'
        '401':
          description: Unauthorized
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
    
    get:
      summary: List user chats
      description: Get all chats for the current user
      tags:
        - Chat
      security:
        - BearerAuth: []
      responses:
        '200':
          description: List of chats retrieved successfully
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Chat'
        '401':
          description: Unauthorized
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /ai/chats/{chatId}:
    get:
      summary: Get chat by ID
      description: Retrieve a specific chat and its messages
      tags:
        - Chat
      security:
        - BearerAuth: []
      parameters:
        - name: chatId
          in: path
          required: true
          description: ID of the chat to retrieve
          schema:
            type: string
      responses:
        '200':
          description: Chat retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Chat'
        '401':
          description: Unauthorized
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '404':
          description: Chat not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

    delete:
      summary: Delete chat
      description: Delete a specific chat and all its messages
      tags:
        - Chat
      security:
        - BearerAuth: []
      parameters:
        - name: chatId
          in: path
          required: true
          description: ID of the chat to delete
          schema:
            type: string
      responses:
        '204':
          description: Chat deleted successfully
        '401':
          description: Unauthorized
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '404':
          description: Chat not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /ai/chats/{chatId}/messages:
    post:
      summary: Send message
      description: Send a message in a specific chat
      tags:
        - Chat
      security:
        - BearerAuth: []
      parameters:
        - name: chatId
          in: path
          required: true
          description: ID of the chat
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                content:
                  type: string
                  description: Message content
              required:
                - content
      responses:
        '200':
          description: Message sent successfully and AI response received
          content:
            application/json:
              schema:
                type: object
                properties:
                  userMessage:
                    $ref: '#/components/schemas/Message'
                  aiMessage:
                    $ref: '#/components/schemas/Message'
        '401':
          description: Unauthorized
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '404':
          description: Chat not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
```

## Authentication

The API uses JWT (JSON Web Token) for authentication. After a successful login, you'll receive a token that must be included in the Authorization header of subsequent requests:

```
Authorization: Bearer <your-jwt-token>
```

## WebSocket Events

Beyond the REST API, the application uses Socket.io for real-time messaging:

### Client Events (Emitted by the frontend)

- `join-chat`: Join a specific chat room
  ```javascript
  socket.emit('join-chat', chatId);
  ```

- `leave-chat`: Leave a chat room
  ```javascript
  socket.emit('leave-chat', chatId);
  ```

- `chat-message`: Send a message in a chat
  ```javascript
  socket.emit('chat-message', {
    chatId: 'chat123',
    content: 'Hello, AI!'
  });
  ```

### Server Events (Listened for by the frontend)

- `message`: Receive a message in a chat
  ```javascript
  socket.on('message', (data) => {
    console.log(`Received message from ${data.sender}: ${data.content}`);
  });
  ```

- `typing`: AI is generating a response
  ```javascript
  socket.on('typing', (chatId) => {
    console.log(`AI is typing in chat ${chatId}...`);
  });
  ```

- `stream`: Receive streaming AI response
  ```javascript
  socket.on('stream', (data) => {
    console.log(`Received partial AI response: ${data.content}`);
  });
  ```

## Error Handling

The API returns standard HTTP status codes along with a JSON object containing:

- `code`: The HTTP status code
- `message`: A human-readable error message
- `details`: Additional information about the error (when available)

Common error codes:
- `400`: Bad Request - Invalid input data
- `401`: Unauthorized - Missing or invalid authentication
- `403`: Forbidden - Insufficient permissions
- `404`: Not Found - Resource doesn't exist
- `409`: Conflict - Resource already exists
- `500`: Internal Server Error - Something went wrong on the server

## Rate Limiting

To prevent abuse, the API implements rate limiting:

- Authentication endpoints: 10 requests per minute
- AI message endpoints: 60 requests per minute
- General endpoints: 100 requests per minute

When rate limits are exceeded, the API returns a `429 Too Many Requests` status code with the following headers:
- `Retry-After`: Seconds to wait before retrying
- `X-RateLimit-Limit`: Maximum requests allowed in the period
- `X-RateLimit-Remaining`: Remaining requests in the current period
- `X-RateLimit-Reset`: Time when the rate limit resets (Unix timestamp)

## Example Requests

### Register a new user

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "securepassword123"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securepassword123"
  }'
```

### Create a new chat

```bash
curl -X POST http://localhost:3000/api/ai/chats \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "My first chat",
    "modelId": "llama2"
  }'
```

### Send a message

```bash
curl -X POST http://localhost:3000/api/ai/chats/chatId123/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "content": "Tell me about artificial intelligence"
  }'
``` 