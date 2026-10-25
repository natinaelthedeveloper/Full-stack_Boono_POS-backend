
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// ============================================
// ADMIN / EMAIL + PASSWORD LOGIN
// POST /api/auth/login
// ============================================
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find user and explicitly include password hash.
    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Admin and existing users can use email/password login.
    const isPasswordValid = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured");
    }

    const token = jwt.sign(
      {
        id: user._id.toString(),
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Email login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};



export const getPublicWaiters = async (req, res) => {
  try {
    const waiters = await User.find({
      role: "waiter",
      isActive: true,
    })
      .select("_id name")
      .sort({ name: 1 })
      .lean();

    res.status(200).json({
      success: true,
      waiters,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load waiters",
    });
  }
};


// ============================================
// WAITER 4-DIGIT PIN LOGIN
// POST /api/auth/pin-login
// ============================================

export const pinLogin = async (req, res) => {
  try {
    const { waiterId, pin } = req.body;

    if (!waiterId || !/^\d{4}$/.test(String(pin ?? ""))) {
      return res.status(400).json({
        success: false,
        message: "Select a waiter and enter a valid 4-digit PIN",
      });
    }

    const waiter = await User.findOne({
      _id: waiterId,
      role: "waiter",
      isActive: true,
    }).select("+pinHash");

    if (!waiter || !waiter.pinHash) {
      return res.status(401).json({
        success: false,
        message: "Invalid waiter or PIN",
      });
    }

    const isMatch = await bcrypt.compare(String(pin), waiter.pinHash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Incorrect PIN. Please try again.",
      });
    }

    const token = jwt.sign(
      {
        id: waiter._id,
        role: waiter.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    return res.status(200).json({
      success: true,
      message: "Waiter login successful",
      token,
      user: {
        _id: waiter._id,
        name: waiter.name,
        role: waiter.role,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Waiter login failed",
    });
  }
};


// ============================================
// GET LOGGED-IN USER
// GET /api/auth/me
// Requires protect middleware
// ============================================
export const getMe = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        isActive: req.user.isActive,
      },
    });
  } catch (error) {
    console.error("Get current user error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve user information",
    });
  }
};
