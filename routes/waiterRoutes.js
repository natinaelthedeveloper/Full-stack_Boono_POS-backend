
import express from "express";

import {
  createWaiter,
  getWaiters,
  getWaiterById,
  updateWaiter,
  deleteWaiter,
} from "../controllers/waiterController.js";

import {
  protect,
  adminOnly,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Every waiter-management endpoint requires Admin access
router.use(protect, adminOnly);

router.post("/", createWaiter);
router.get("/", getWaiters);
router.get("/:id", getWaiterById);
router.put("/:id", updateWaiter);
router.delete("/:id", deleteWaiter);

export default router;
