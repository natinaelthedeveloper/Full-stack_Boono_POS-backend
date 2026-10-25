
import express from "express";
import {
  login,
  pinLogin,
  getMe,
  getPublicWaiters,
} from "../controllers/authController.js";
import {
  protect,
  adminOnly,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/waiters", getPublicWaiters);
router.post("/login", login);
router.post("/pin-login", pinLogin);

router.get("/me", protect, getMe);

router.get("/admin-test", protect, adminOnly, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Admin access granted",
  });
});

export default router;
