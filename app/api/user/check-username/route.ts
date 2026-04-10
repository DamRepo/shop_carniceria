import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = (session.user as { id?: string }).id;

  const url = new URL(request.url);
  const u = (url.searchParams.get("u") ?? "").trim();

  if (u.length < 3) {
    return NextResponse.json({ available: false, error: "Mínimo 3 caracteres" });
  }

  const existing = await prisma.user.findFirst({
    where: {
      username: u,
      ...(userId ? { NOT: { id: userId } } : {}),
    },
    select: { id: true },
  });

  return NextResponse.json({ available: !existing });
}
