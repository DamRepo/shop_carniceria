import { getCloudinary } from "./cloudinary";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

const MAX_BYTES = 6 * 1024 * 1024; // 6MB

type DetectedImageType = "image/jpeg" | "image/png" | "image/webp" | "image/avif";

function detectImageMime(buffer: Buffer): DetectedImageType | null {
  if (buffer.length < 12) return null;

  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // WEBP
  if (
    buffer[0] === 0x52 && // R
    buffer[1] === 0x49 && // I
    buffer[2] === 0x46 && // F
    buffer[3] === 0x46 && // F
    buffer[8] === 0x57 && // W
    buffer[9] === 0x45 && // E
    buffer[10] === 0x42 && // B
    buffer[11] === 0x50 // P
  ) {
    return "image/webp";
  }

  // AVIF (ISO BMFF / ftyp avif or avis)
  if (
    buffer.length >= 12 &&
    buffer[4] === 0x66 && // f
    buffer[5] === 0x74 && // t
    buffer[6] === 0x79 && // y
    buffer[7] === 0x70 && // p
    (
      (buffer[8] === 0x61 && buffer[9] === 0x76 && buffer[10] === 0x69 && buffer[11] === 0x66) || // avif
      (buffer[8] === 0x61 && buffer[9] === 0x76 && buffer[10] === 0x69 && buffer[11] === 0x73)    // avis
    )
  ) {
    return "image/avif";
  }

  return null;
}

export async function uploadImages(files: File[]) {
  if (!files.length) return [];

  const cloudinary = getCloudinary();

  const uploads = files.map(async (image) => {
    if (!ALLOWED_MIME.has(image.type)) {
      throw new Error(`Tipo no permitido: ${image.type}`);
    }

    if (image.size > MAX_BYTES) {
      throw new Error(`Archivo muy grande: ${image.name}`);
    }

    const buffer = Buffer.from(await image.arrayBuffer());

    const detectedMime = detectImageMime(buffer);

    if (!detectedMime) {
      throw new Error(`El archivo no es una imagen válida: ${image.name}`);
    }

    if (detectedMime !== image.type) {
      throw new Error(
        `El tipo real del archivo no coincide con el declarado: ${image.name}`
      );
    }

    const base64 = buffer.toString("base64");
    const dataUri = `data:${detectedMime};base64,${base64}`;

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