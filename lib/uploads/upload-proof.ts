import { getCloudinary } from "./cloudinary";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
]);

type AllowedMime = "image/jpeg" | "image/png" | "application/pdf";

function detectMime(buffer: Buffer): AllowedMime | null {
  if (buffer.length < 8) return null;

  // JPEG — FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG — 89 50 4E 47 0D 0A 1A 0A
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

  // PDF — %PDF
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return "application/pdf";
  }

  return null;
}

export async function uploadTransferProof(
  file: File,
  transferCode: string
): Promise<string> {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error("Tipo de archivo no permitido. Usá JPG, PNG o PDF.");
  }

  if (file.size > MAX_BYTES) {
    throw new Error("El archivo supera el tamaño máximo de 5 MB.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const detected = detectMime(buffer);
  if (!detected) {
    throw new Error("El archivo no es una imagen o PDF válido.");
  }

  if (detected !== file.type) {
    throw new Error("El contenido del archivo no coincide con su extensión.");
  }

  const cloudinary = getCloudinary();

  const isPdf = detected === "application/pdf";
  const base64 = buffer.toString("base64");
  const dataUri = `data:${detected};base64,${base64}`;

  const publicIdBase = `${transferCode}_${Date.now()}`;

  const res = await cloudinary.uploader.upload(dataUri, {
    folder: "carniceria/comprobantes",
    public_id: publicIdBase,
    resource_type: isPdf ? "raw" : "image",
  });

  return res.secure_url;
}
