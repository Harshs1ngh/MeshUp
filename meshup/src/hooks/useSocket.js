// 📁 src/hooks/useSocket.js
import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

// ✅ Singleton — one socket shared across the whole app
let socketInstance = null;

export function getSocket() {
  if (!socketInstance) {
    socketInstance = io("http://localhost:8000", {
      withCredentials: true,   // sends cookie for auth
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });
  }
  return socketInstance;
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}

export default function useSocket() {
  const ref = useRef(null);
  useEffect(() => {
    ref.current = getSocket();
  }, []);
  return ref.current;
}