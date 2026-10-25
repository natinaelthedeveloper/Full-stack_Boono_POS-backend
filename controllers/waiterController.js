import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/User.js";

// ============================================
// HELPER: Normalize Ethiopian phone numbers
// Accepts 0912345678, 0712345678,
// +251912345678, +251712345678
// Stores numbers in +251XXXXXXXXX format.
// ============================================
const normalizeEthiopianPhone = (value) => {
  if (typeof value !== "string") return null;

  const phone = value.trim().replace(/[\s()-]/g, "");

  if (/^0[97]\d{8}$/.test(phone)) {
    return `+251${phone.slice(1)}`;
  }

  if (/^\+251[97]\d{8}$/.test(phone)) {
    return phone;
  }

  return null;
};

// ============================================
// HELPER: Generate a unique 4-digit PIN
// ============================================
const generateUniquePin = async () => {
  const waiters = await User.find({
    role: "waiter",
    isActive: true,
  }).select("+pinHash");

  for (let attempt = 0; attempt < 20; attempt++) {
    const pin = crypto
      .randomInt(0, 10000)
      .toString()
      .padStart(4, "0");

    let alreadyUsed = false;

    for (const waiter of waiters) {
      if (!waiter.pinHash) continue;

      if (await bcrypt.compare(pin, waiter.pinHash)) {
        alreadyUsed = true;
        break;
      }
    }

    if (!alreadyUsed) {
      return {
        pin,
        pinHash: await bcrypt.hash(pin, 12),
      };
    }
  }

  throw new Error("Could not generate a unique PIN. Please try again.");
};

// ============================================
// POST /api/waiters
// Create a new waiter
// ============================================
export const createWaiter = async (req, res) => {
  try {
    const { name, phoneNumber, password } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof phoneNumber !== "string" ||
      !phoneNumber.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Name and phone number are required",
      });
    }

    if (
      password !== undefined &&
      (typeof password !== "string" || password.length < 8)
    ) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    const normalizedPhone = normalizeEthiopianPhone(phoneNumber);

    if (!normalizedPhone) {
      return res.status(400).json({
        success: false,
        message:
          "Enter a valid Ethiopian phone number, e.g. 0912345678",
      });
    }

    const existingUser = await User.findOne({
      phoneNumber: normalizedPhone,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "This phone number is already registered",
      });
    }

    // Waiter login uses a PIN, so a password is optional.
    const passwordToHash =
      password ?? crypto.randomBytes(32).toString("hex");

    const hashedPassword = await bcrypt.hash(passwordToHash, 12);

    const { pin, pinHash } = await generateUniquePin();

    const waiter = await User.create({
      name: name.trim(),
      phoneNumber: normalizedPhone,
      password: hashedPassword,
      pinHash,
      role: "waiter",
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Waiter registered successfully. Give this PIN to the waiter.",
      waiter: {
        id: waiter._id,
        name: waiter.name,
        phoneNumber: waiter.phoneNumber,
        role: waiter.role,
        isActive: waiter.isActive,
        createdAt: waiter.createdAt,
      },
      pin,
    });
  } catch (error) {
    console.error("Create waiter error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This phone number is already registered",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to register waiter",
    });
  }
};

// ============================================
// GET /api/waiters
// Get all waiters
// ============================================
export const getWaiters = async (req, res) => {
  try {
    const waiters = await User.find({ role: "waiter" })
      .select("-password")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: waiters.length,
      waiters,
    });
  } catch (error) {
    console.error("Get waiters error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve waiters",
    });
  }
};

// ============================================
// GET /api/waiters/:id
// Get one waiter
// ============================================
export const getWaiterById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid waiter ID",
      });
    }

    const waiter = await User.findOne({
      _id: id,
      role: "waiter",
    }).select("-password");

    if (!waiter) {
      return res.status(404).json({
        success: false,
        message: "Waiter not found",
      });
    }

    return res.status(200).json({
      success: true,
      waiter,
    });
  } catch (error) {
    console.error("Get waiter error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve waiter",
    });
  }
};

// ============================================
// PUT /api/waiters/:id
// Update waiter details or reset PIN
// ============================================
export const updateWaiter = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phoneNumber, password, isActive, resetPin } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid waiter ID",
      });
    }

    if (resetPin !== undefined && typeof resetPin !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "resetPin must be true or false",
      });
    }

    const waiter = await User.findOne({
      _id: id,
      role: "waiter",
    }).select("+password +pinHash");

    if (!waiter) {
      return res.status(404).json({
        success: false,
        message: "Waiter not found",
      });
    }

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Name cannot be empty",
        });
      }

      waiter.name = name.trim();
    }

    if (phoneNumber !== undefined) {
      if (typeof phoneNumber !== "string" || !phoneNumber.trim()) {
        return res.status(400).json({
          success: false,
          message: "Phone number cannot be empty",
        });
      }

      const normalizedPhone = normalizeEthiopianPhone(phoneNumber);

      if (!normalizedPhone) {
        return res.status(400).json({
          success: false,
          message:
            "Enter a valid Ethiopian phone number, e.g. 0912345678",
        });
      }

      const phoneOwner = await User.findOne({
        phoneNumber: normalizedPhone,
        _id: { $ne: id },
      });

      if (phoneOwner) {
        return res.status(409).json({
          success: false,
          message: "This phone number is already in use",
        });
      }

      waiter.phoneNumber = normalizedPhone;
    }

    if (password !== undefined) {
      if (typeof password !== "string" || password.length < 8) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 8 characters",
        });
      }

      waiter.password = await bcrypt.hash(password, 12);
    }

    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "isActive must be true or false",
        });
      }

      waiter.isActive = isActive;
    }

    let newPin;

    if (resetPin === true) {
      if (!waiter.isActive) {
        return res.status(400).json({
          success: false,
          message: "Activate the waiter before resetting the PIN",
        });
      }

      const generated = await generateUniquePin();
      newPin = generated.pin;
      waiter.pinHash = generated.pinHash;
    }

    await waiter.save();

    return res.status(200).json({
      success: true,
      message: newPin
        ? "Waiter updated and PIN reset successfully"
        : "Waiter updated successfully",
      waiter: {
        id: waiter._id,
        name: waiter.name,
        phoneNumber: waiter.phoneNumber,
        role: waiter.role,
        isActive: waiter.isActive,
        updatedAt: waiter.updatedAt,
      },
      ...(newPin ? { pin: newPin } : {}),
    });
  } catch (error) {
    console.error("Update waiter error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This phone number is already in use",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update waiter",
    });
  }
};

// ============================================
// DELETE /api/waiters/:id
// Deactivate waiter; preserve order history
// ============================================
export const deleteWaiter = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid waiter ID",
      });
    }

    const waiter = await User.findOneAndUpdate(
      {
        _id: id,
        role: "waiter",
        isActive: true,
      },
      {
        $set: { isActive: false },
      },
      { new: true }
    ).select("-password");

    if (!waiter) {
      return res.status(404).json({
        success: false,
        message: "Active waiter not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Waiter deactivated successfully",
      waiter,
    });
  } catch (error) {
    console.error("Deactivate waiter error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to deactivate waiter",
    });
  }
};