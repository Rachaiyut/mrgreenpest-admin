
import { io } from 'socket.io-client';

// Get the API URL from environment variables
const URL = process.env.VITE_API_BASE_URL

export const socket = io(URL, {
  autoConnect: false, 
  withCredentials: true,
  transports: ['websocket', 'polling'],
});
