
import express from "express";

import {
  sendMessage,
  getRoomMessages,
} from "../controllers/chat.controller.js";

const router = express.Router();


router.post("/", sendMessage);


router.get("/:roomCode", getRoomMessages);

export default router;
