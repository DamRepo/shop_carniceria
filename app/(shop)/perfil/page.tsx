import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { ProfileClient } from "./ProfileClient";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login?callbackUrl=/perfil");
  }

  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    redirect("/auth/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      image: true,
      username: true,
      role: true,
      createdAt: true,
      _count: { select: { orders: true } },
    },
  });

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <ProfileClient
      user={{
        id: user.id,
        name: user.name ?? "",
        email: user.email,
        phone: user.phone ?? "",
        image: user.image ?? null,
        username: user.username ?? "",
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        orderCount: user._count.orders,
      }}
    />
  );
}
