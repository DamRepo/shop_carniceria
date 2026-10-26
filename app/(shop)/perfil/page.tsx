import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { ProfileClient } from "./ProfileClient";
import {
  getPointsBalance,
  getPointsHistory,
  isPointsEnabled,
  pointsToCents,
} from "@/lib/loyalty-points";
import type { ProfilePointsData } from "@/components/loyalty/profile-points-section";

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

  // "Mis puntos": solo con el flag prendido y para clientes. Con el flag
  // apagado no se consulta nada y el perfil queda igual que antes.
  let points: ProfilePointsData | null = null;
  if (isPointsEnabled() && user.role === "CUSTOMER") {
    try {
      const [balance, history] = await Promise.all([
        getPointsBalance(user.id),
        getPointsHistory(user.id, 20),
      ]);
      points = {
        balance: balance.available,
        balanceCents: pointsToCents(balance.available),
        nextExpiry: balance.nextExpiry
          ? { points: balance.nextExpiry.points, expiresAt: balance.nextExpiry.expiresAt.toISOString() }
          : null,
        history: history.map((h) => ({
          kind: h.kind,
          points: h.points,
          date: h.date.toISOString(),
          orderNumber: h.orderNumber,
        })),
      };
    } catch (e) {
      // Si falla la lectura de puntos, el resto del perfil se muestra igual.
      console.error("perfil: error cargando puntos", e);
    }
  }

  return (
    <ProfileClient
      points={points}
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
