
import mongoose from "mongoose";

const dailyReportSchema = new mongoose.Schema(
  {
    businessDate: {
      type: String,
      required: true,
      unique: true,
    },
    totalOrders: {
      type: Number,
      required: true,
      default: 0,
    },
    totalRevenue: {
      type: Number,
      required: true,
      default: 0,
    },
    products: [
      {
        name: { type: String, required: true },
        quantitySold: { type: Number, required: true },
        revenue: { type: Number, required: true },
      },
    ],
    closedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const DailyReport = mongoose.model(
  "DailyReport",
  dailyReportSchema
);

export default DailyReport;
