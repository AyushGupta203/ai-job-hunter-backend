import express from "express";
import { registerUser, loginUser , getMe , verifyEmail, resendVerification} from "../controllers/auth.controller.js";
import { auth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", auth, getMe);
router.get("/verify-email/:token", verifyEmail);
router.post("/resend-verification", resendVerification);
export default router;