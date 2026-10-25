
import express from "express";
import {
  getSalesReport,
  closeDayReport,
  getReportHistory,
} from "../controllers/reportController.js";
import {
  protect,
  adminOnly,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect, adminOnly);

router.get("/sales", getSalesReport);
router.get("/history", getReportHistory);
router.post("/close-day", closeDayReport);

export default router;
