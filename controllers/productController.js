
import mongoose from "mongoose";
import Product from "../models/Product.js";

// POST /api/products
// Create a new product
export const createProduct = async (req, res) => {
  try {
    const { name, type, price } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      !["food", "drink"].includes(type) ||
      price === undefined ||
      price === null ||
      price === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, type, and price are required",
      });
    }

    const numericPrice = Number(price);

    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: "Price must be a number greater than zero",
      });
    }

    const product = await Product.create({
      name: name.trim(),
      type,
      price: numericPrice,
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    console.error("Create product error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to create product",
    });
  }
};

// GET /api/products
// Get available products, with optional type filtering
export const getProducts = async (req, res) => {
  try {
    const filter = {};

    // Admin can request unavailable products too.
    if (req.query.includeUnavailable === "true") {
      if (req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Admin access required to view unavailable products",
        });
      }
    } else {
      filter.isAvailable = true;
    }

    if (req.query.type !== undefined) {
      if (!["food", "drink"].includes(req.query.type)) {
        return res.status(400).json({
          success: false,
          message: "Type must be food or drink",
        });
      }

      filter.type = req.query.type;
    }

    const products = await Product.find(filter).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("Get products error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve products",
    });
  }
};

// GET /api/products/:id
// Get one product
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (!product.isAvailable && req.user.role !== "admin") {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    console.error("Get product error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve product",
    });
  }
};

// PUT /api/products/:id
// Update product information
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, price, isAvailable } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Name cannot be empty",
        });
      }

      product.name = name.trim();
    }

    if (type !== undefined) {
      if (!["food", "drink"].includes(type)) {
        return res.status(400).json({
          success: false,
          message: "Type must be food or drink",
        });
      }

      product.type = type;
    }

    if (price !== undefined) {
      if (
        price === null ||
        price === "" ||
        !Number.isFinite(Number(price)) ||
        Number(price) <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Price must be a number greater than zero",
        });
      }

      product.price = Number(price);
    }

    if (isAvailable !== undefined) {
      if (typeof isAvailable !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "isAvailable must be true or false",
        });
      }

      product.isAvailable = isAvailable;
    }

    await product.save();

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    console.error("Update product error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update product",
    });
  }
};

// DELETE /api/products/:id
// Remove from sale without deleting historical data
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product = await Product.findOneAndUpdate(
      { _id: id, isAvailable: true },
      { $set: { isAvailable: false } },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Available product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product removed from sale successfully",
      product,
    });
  } catch (error) {
    console.error("Delete product error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to remove product from sale",
    });
  }
};
