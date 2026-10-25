
import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";

// POST /api/orders
// Only Waiters can submit orders.
export const createOrder = async (req, res) => {
  try {
    // Check the logged-in user's role.
    if (req.user.role !== "waiter") {
      return res.status(403).json({
        success: false,
        message: "Only waiters can submit orders",
      });
    }

    const { items } = req.body;

    // Validate the order items.
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please add at least one item to the order",
      });
    }

    // Validate product IDs and quantities.
    for (const item of items) {
      if (
        !item ||
        typeof item.productId !== "string" ||
        !mongoose.isValidObjectId(item.productId) ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Each item needs a valid productId and a positive whole-number quantity",
        });
      }
    }

    // Prevent duplicate product entries in one order.
    const productIds = items.map((item) => item.productId);

    if (new Set(productIds).size !== productIds.length) {
      return res.status(400).json({
        success: false,
        message:
          "Each product should appear only once. Combine its quantity instead.",
      });
    }

    // Find products that are available for sale.
    const products = await Product.find({
      _id: { $in: productIds },
      isAvailable: true,
    });

    if (products.length !== productIds.length) {
      return res.status(400).json({
        success: false,
        message:
          "One or more products do not exist or are unavailable",
      });
    }

    // Match each requested product with its database record.
    const productMap = new Map(
      products.map((product) => [
        product._id.toString(),
        product,
      ])
    );

    let totalAmount = 0;

    // Calculate prices on the server.
    // Never trust prices or totals sent by the client.
    const orderItems = items.map((item) => {
      const product = productMap.get(item.productId);

      const subtotal = product.price * item.quantity;

      totalAmount += subtotal;

      return {
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        subtotal,
      };
    });

    // Save the order only when this endpoint is submitted.
    const order = await Order.create({
      waiter: req.user._id,
      items: orderItems,
      totalAmount
    });

    return res.status(201).json({
      success: true,
      message: "Order submitted successfully",
      order,
    });
  } catch (error) {
    console.error("Create order error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to submit order",
    });
  }
};

// GET /api/orders/my-orders
// Waiters can see only their own order history.
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      waiter: req.user._id,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Get my orders error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve your orders",
    });
  }
};

// GET /api/orders
// Admin can see all waiters' orders.
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("waiter", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Get all orders error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve orders",
    });
  }
};

// GET /api/orders/:id
// Admin or the waiter who owns the order can view it.
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const order = await Order.findById(id).populate(
      "waiter",
      "name email"
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const orderWaiterId =
      order.waiter?._id?.toString() ??
      order.waiter?.toString();

    if (
      req.user.role !== "admin" &&
      orderWaiterId !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You cannot access another waiter's order",
      });
    }

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Get order error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve order",
    });
  }
};

