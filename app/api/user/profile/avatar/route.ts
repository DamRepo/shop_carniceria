import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeFile, unlink, mkdir } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 2 * 1024 * 1024;

function extFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

function getUploadDir(): string {
  const base = process.env.UPLOAD_DIR ?? "./public/uploads";
  return path.join(base, "avatars");
}

function getFileUrl(filename: string): string {
  const base = process.env.UPLOAD_URL ?? "/uploads";
  return `${base}/avatars/${filename}`;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: "Usuario no identificado" }, { status: 401 });
    }

    const form = await request.formData();
    const file = form.get("avatar");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Formato no soportado. Usá JPG, PNG o WEBP." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "La imagen no debe superar 2MB" }, { status: 400 });
    }

    const uploadDir = getUploadDir();
    await mkdir(uploadDir, { recursive: true });

    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { image: true },
    });

    if (existing?.image && existing.image.startsWith("/uploads/avatars/")) {
      const oldFilename = path.basename(existing.image);
      const oldPath = path.join(uploadDir, oldFilename);
      await unlink(oldPath).catch(() => undefined);
    }

    const ext = extFromMime(file.type);
    const filename = `${userId}.${ext}`;
    const filePath = path.join(uploadDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const imageUrl = getFileUrl(filename);

    await prisma.user.update({
      where: { id: userId },
      data: { image: imageUrl },
    });

    return NextResponse.json({ success: true, imageUrl });
  } catch (error) {
    console.error("Error uploading avatar:", error);
    return NextResponse.json({ error: "Error al subir la imagen" }, { status: 500 });
  }
}

export async function DELETE(_request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: "Usuario no identificado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { image: true },
    });

    if (user?.image && user.image.startsWith("/uploads/avatars/")) {
      const filename = path.basename(user.image);
      const filePath = path.join(getUploadDir(), filename);
      await unlink(filePath).catch(() => undefined);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { image: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting avatar:", error);
    return NextResponse.json({ error: "Error al eliminar la imagen" }, { status: 500 });
  }
}
