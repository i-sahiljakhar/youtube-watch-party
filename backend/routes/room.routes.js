import express from "express";
import { createRoom, joinRoom } from "../controllers/room.controller.js";

const router = express.Router();

router.post("/", createRoom);
router.get("/:roomCode", joinRoom);

export default router;
