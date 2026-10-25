
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    email: {
  type: String,
  trim: true,
  lowercase: true,
  unique: true,
  sparse: true,
  required: function () {
    return this.role === "admin";
  },
},

phoneNumber: {
  type: String,
  trim: true,
  unique: true,
  sparse: true,
  required: function () {
    return this.role === "waiter";
  },
},

    password: {
      type: String,
      required: [true, "Password is required"],
      select: false,
    },

    // Store the waiter's 4-digit PIN as a hash.
    // Do not require it for Admin accounts.
    pinHash: {
      type: String,
      select: false,
    },

    role: {
      type: String,
      enum: ["admin", "waiter"],
      required: true,
      default: "waiter",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;
