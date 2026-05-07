import express from "express";
import { auth } from "../../../middleware/auth.middleware";
import { updateProfile } from "../../../controllers/user.controller";

const router = express.Router();

router.put("/", auth, updateProfile);

export default router;