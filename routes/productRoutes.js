
import express from "express";

import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from "../controllers/productController.js";

import {
  protect,
  adminOnly,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Every product endpoint requires login.
router.use(protect);

// Logged-in Admins and Waiters can view products.
router.get("/", getProducts);
router.get("/:id", getProductById);

// Only Admin can create, update, or remove products.
router.post("/", adminOnly, createProduct);
router.put("/:id", adminOnly, updateProduct);
router.delete("/:id", adminOnly, deleteProduct);

export default router;
