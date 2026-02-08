import { v2 as cloudinary } from "cloudinary";

let isConfigured = false;

export function getCloudinary() {
  if (!isConfigured) {
    const url = process.env.CLOUDINARY_URL;
    if (!url) {
      throw new Error("Falta CLOUDINARY_URL en .env");
    }

    cloudinary.config(url);
    isConfigured = true;
  }

  return cloudinary;
}
