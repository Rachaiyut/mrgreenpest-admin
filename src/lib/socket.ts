
import { io } from 'socket.io-client';

// Get the API URL from environment variables
const URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export const socket = io(URL, {
  autoConnect: false, // We will connect manually
  withCredentials: true, // Important for sending cookies/auth tokens
  transports: ['websocket', 'polling'],
});
