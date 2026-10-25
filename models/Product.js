
import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },

    type: {
      type: String,
      enum: ["food", "drink"],
      required: [true, "Product type must be food or drink"],
    },

    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: [0.01, "Price must be greater than zero"],
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);

export default Product;
