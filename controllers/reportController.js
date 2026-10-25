
import mongoose from "mongoose";
import Order from "../models/Order.js";
import DailyReport from "../models/DailyReport.js";

// Ethiopia business date: YYYY-MM-DD
const getEthiopiaDate = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Addis_Ababa",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value])
  );

  return `${values.year}-${values.month}-${values.day}`;
};

// Convert an Ethiopia business date into UTC boundaries.
const getBusinessDayRange = (businessDate) => {
  const [year, month, day] = businessDate.split("-").map(Number);

  // Ethiopia is UTC+3 with no daylight-saving time.
  const start = new Date(Date.UTC(year, month - 1, day, -3, 0, 0, 0));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return { start, end };
};

// Build a sales summary from orders.
const summarizeOrders = (orders) => {
  const productsMap = new Map();
  let totalRevenue = 0;

  for (const order of orders) {
    totalRevenue += order.totalAmount;

    for (const item of order.items) {
      const current = productsMap.get(item.name) || {
        name: item.name,
        quantitySold: 0,
        revenue: 0,
      };

      current.quantitySold += item.quantity;
      current.revenue += item.subtotal;

      productsMap.set(item.name, current);
    }
  }

  return {
    totalOrders: orders.length,
    totalRevenue: Number(totalRevenue.toFixed(2)),
    products: [...productsMap.values()].map((product) => ({
      ...product,
      revenue: Number(product.revenue.toFixed(2)),
    })),
  };
};

// GET /api/reports/sales
export const getSalesReport = async (req, res) => {
  try {
    const businessDate = getEthiopiaDate();
    const { start, end } = getBusinessDayRange(businessDate);

    const orders = await Order.find({
      createdAt: { $gte: start, $lt: end },
    }).lean();

    const today = summarizeOrders(orders);

    const savedReports = await DailyReport.find().lean();
    const currentOrders = await Order.find().lean();
    const currentSummary = summarizeOrders(currentOrders);

    const historicalOrders = savedReports.reduce(
      (sum, report) => sum + report.totalOrders,
      0
    );

    const historicalRevenue = savedReports.reduce(
      (sum, report) => sum + report.totalRevenue,
      0
    );

    res.status(200).json({
      success: true,
      businessDate,
      today,
      allTime: {
        totalOrders: historicalOrders + currentSummary.totalOrders,
        totalRevenue: Number(
          (historicalRevenue + currentSummary.totalRevenue).toFixed(2)
        ),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get sales report",
      error: error.message,
    });
  }
};

// POST /api/reports/close-day
export const closeDayReport = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const businessDate = getEthiopiaDate();
    const { start, end } = getBusinessDayRange(businessDate);
    let savedReport;

    await session.withTransaction(async () => {
      const existingReport = await DailyReport.findOne({
        businessDate,
      }).session(session);

      if (existingReport) {
        const error = new Error(
          "Today's report has already been saved."
        );
        error.statusCode = 409;
        throw error;
      }

      const orders = await Order.find({
        createdAt: { $gte: start, $lt: end },
      })
        .session(session)
        .lean();

      const summary = summarizeOrders(orders);

      const [report] = await DailyReport.create(
        [
          {
            businessDate,
            totalOrders: summary.totalOrders,
            totalRevenue: summary.totalRevenue,
            products: summary.products,
            closedAt: new Date(),
          },
        ],
        { session }
      );

      savedReport = report;

      if (orders.length > 0) {
        await Order.deleteMany(
          { _id: { $in: orders.map((order) => order._id) } },
          { session }
        );
      }
    });

    res.status(200).json({
      success: true,
      message:
        "Daily report saved and today's order history cleared successfully.",
      report: savedReport,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to close the business day",
    });
  } finally {
    await session.endSession();
  }
};

// GET /api/reports/history
export const getReportHistory = async (req, res) => {
  try {
    const reports = await DailyReport.find().sort({
      businessDate: -1,
    });

    res.status(200).json({
      success: true,
      count: reports.length,
      reports,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get report history",
      error: error.message,
    });
  }
};
