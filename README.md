# ConnectLive

A modern, secure, and intuitive video conferencing application inspired by Zoom. ConnectLive demonstrates full-stack web development capabilities with a focus on real-time communication, responsive design, and smooth animations.

## Features

- Real-time video and audio conferencing using WebRTC
- Live chat system during calls
- Screen sharing capabilities
- Interactive whiteboard for collaboration
- Secure user authentication with JWT
- Responsive design for all devices
- Smooth animations using Framer Motion
- Real-time data synchronization with Socket.IO

## Tech Stack

### Frontend
- React.js with TypeScript
- Chakra UI for components
- Framer Motion for animations
- Socket.IO client
- WebRTC (simple-peer)
- Axios for API calls

### Backend
- Node.js
- Express.js
- MongoDB
- Socket.IO
- JWT for authentication
- WebRTC signaling server

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (running on mongodb://localhost:27017/)
- npm or yarn package manager

### Installation

1. Install dependencies:
```bash
npm run install:all
```

2. Create .env files:

Backend (.env):
```
PORT=5001
MONGODB_URI=mongodb://localhost:27017/connectlive
JWT_SECRET=your_secret_key_here
FRONTEND_URL=http://localhost:3000
```

Frontend (.env):
```
REACT_APP_API_URL=http://localhost:5001
```

3. Start the application:
```bash
npm start
```

## Project Structure

```
connectlive/
├── frontend/           # React frontend application
│   ├── public/        # Static files
│   └── src/           # Source files
│       ├── components/# React components
│       ├── pages/     # Page components
│       ├── context/   # React context
│       ├── hooks/     # Custom hooks
│       ├── services/  # API services
│       └── styles/    # Global styles
└── backend/           # Node.js backend application
    ├── config/        # Configuration files
    ├── controllers/   # Route controllers
    ├── models/        # Database models
    ├── routes/        # API routes
    ├── middleware/    # Custom middleware
    └── utils/         # Utility functions
```

## License

MIT License 