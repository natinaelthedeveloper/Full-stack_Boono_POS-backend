
import express from "express";

import {
  createOrder,
  getMyOrders,
  getAllOrders,
  getOrderById,
  
} from "../controllers/orderController.js";

import {
  protect,
  adminOnly,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Every order endpoint requires a valid login.
router.use(protect);

// Keep this route above /:id.
router.get("/my-orders", getMyOrders);

// Only Admin can see every order.
router.get("/", adminOnly, getAllOrders);

// Admin or the owner waiter can view one order.
router.get("/:id", getOrderById);


// A logged-in user submits an order.
// The controller below will restrict this to Waiters.
router.post("/", createOrder);

export default router;
