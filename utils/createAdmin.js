
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectDB from "../config/db.js";
import User from "../models/User.js";

const createAdmin = async () => {
  try {
    await connectDB();

    const email = process.env.ADMIN_EMAIL?.toLowerCase();
    const name = process.env.ADMIN_NAME;
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !name || !password) {
      throw new Error("Admin environment variables are missing");
    }

    if (password.length < 12) {
      throw new Error("Admin password must be at least 12 characters");
    }

    const existingAdmin = await User.findOne({ email });

    if (existingAdmin) {
      console.log("An account with this email already exists.");
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await User.create({
      name,
      email,
      password: hashedPassword,
      role: "admin",
      isActive: true,
    });

    console.log("Admin account created successfully.");
  } catch (error) {
    console.error("Admin creation failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

createAdmin();
