import express from "express";
import { auth } from "../middleware/auth.middleware.js";
import { updateProfile } from "../controllers/user.controller.js";

const router = express.Router();

router.put("/profile", auth, updateProfile);

export default router;
