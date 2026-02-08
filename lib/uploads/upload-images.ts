import { getCloudinary } from "./cloudinary";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

const MAX_BYTES = 6 * 1024 * 1024; // 6MB

export async function uploadImages(files: File[]) {
  if (!files.length) return [];

  for (const f of files) {
    if (!ALLOWED_MIME.has(f.type)) {
      throw new Error(`Tipo no permitido: ${f.type}`);
    }
    if (f.size > MAX_BYTES) {
      throw new Error(`Archivo muy grande: ${f.name}`);
    }
  }

  const cloudinary = getCloudinary();

  const uploads = files.map(async (image) => {
    const buffer = Buffer.from(await image.arrayBuffer());
    const base64 = buffer.toString("base64");
    const dataUri = `data:${image.type};base64,${base64}`;

    const res = await cloudinary.uploader.upload(dataUri, {
      folder: process.env.CLOUDINARY_FOLDER || "carniceria/products",
      resource_type: "image",
    });

    return {
      secureUrl: res.secure_url,
      publicId: res.public_id,
    };
  });

  return Promise.all(uploads);
}
