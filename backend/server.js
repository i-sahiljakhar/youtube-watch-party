

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";

import connectDB from "./config/db.js";
import roomRoutes from "./routes/room.routes.js";
import chatRoutes from './routes/chat.routes.js'
import initializeSocket from "./sockets/socket.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

app.use(
  cors({
    origin: FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  }),
);

app.use(express.json());

// API routes
app.use("/api/rooms", roomRoutes);
app.use('/api/chat',chatRoutes)
// Home route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is working",
  });
});


const server = http.createServer(app);


const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ["GET", "POST"],
  },
});


initializeSocket(io);


const startServer = async () => {
  try {
    await connectDB();

    server.listen(PORT, () => {
      console.log(`Server started on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();
