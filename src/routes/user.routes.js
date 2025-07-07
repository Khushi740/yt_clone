import express from "express";
import { registerUser } from "../controllers/user.controller.js";

const router = express.Router();

router.post("/register", registerUser); // 👈 Defines POST /register

export default router;
