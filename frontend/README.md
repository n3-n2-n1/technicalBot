# AI Chat Platform - Frontend

## Architecture Overview

The frontend of the AI Chat Platform is built with React and follows a modern component-based architecture:

```
frontend/
├── public/           # Static assets
├── src/              # Source code
│   ├── components/   # Reusable UI components
│   ├── context/      # React context for state management
│   ├── pages/        # Application views/routes
│   ├── services/     # API client services
│   ├── App.jsx       # Main application component
│   └── main.jsx      # Application entry point
└── index.html        # HTML template
```

## Technical Stack

- **React**: UI library for building component-based interfaces
- **React Router**: Client-side routing
- **Context API**: State management
- **Axios**: HTTP client for API requests
- **Socket.io Client**: Real-time communication with the backend
- **Tailwind CSS**: Utility-first CSS framework
- **Vite**: Build tool and development server

## Component Architecture

The application follows a modular component architecture:

- **Page Components**: Top-level components representing routes
- **Functional Components**: Stateless UI elements
- **Container Components**: Manage state and data fetching
- **Context Providers**: Share state across components

## Pages/Views

- **Login**: User authentication
- **Register**: New user registration
- **Dashboard**: User's main interface with list of chats
- **Chat**: Real-time chat interface with AI models

## Authentication & State Management

The application uses React Context API for authentication state management:

- **AuthContext**: Manages user authentication state
- **LocalStorage**: Persists JWT token between sessions
- **Protected Routes**: Prevent unauthorized access to private pages

## API Integration

The frontend communicates with the backend through:

- **RESTful API**: For CRUD operations using Axios
- **WebSockets**: For real-time messaging using Socket.io
- **Interceptors**: Handle authentication headers and errors

## Real-time Features

Socket.io client is used to implement real-time chat features:

- **Message Streaming**: Real-time display of AI responses
- **Typing Indicators**: Show when AI is generating a response
- **Presence Awareness**: Connection status indicators

## UI/UX Design Decisions

- **Responsive Design**: Mobile-first approach using Tailwind CSS
- **Component Hierarchy**: Logical grouping of UI elements
- **Error Handling**: User-friendly error messages and state management
- **Loading States**: Visual feedback during asynchronous operations

## Development

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

4. Preview production build:
```bash
npm run preview
```

## Environment Configuration

The application uses Vite's environment variables system. To configure, create a `.env` file in the frontend directory:

```
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

## Code Style and Conventions

- **Component Structure**: Each component in its own file
- **Naming Conventions**: PascalCase for components, camelCase for functions
- **CSS Approach**: Tailwind utility classes with custom extensions when needed

## Browser Compatibility

The application is optimized for modern browsers supporting ES6+ features. For broader compatibility, consider adding polyfills or using a tool like Babel. 