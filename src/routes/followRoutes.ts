import express from "express";
import { getFollows, followUser, unfollowUser } from "../controllers/followController";
import { authenticate } from "../middlewares/authMiddleware";

const router = express.Router();

// GET followers / following
router.get("/", authenticate, getFollows);

// FOLLOW
router.post("/", authenticate, followUser);

// UNFOLLOW
router.delete("/", authenticate, unfollowUser);

export default router;