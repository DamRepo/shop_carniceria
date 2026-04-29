import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import LoginClient from "./LoginClient";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: { callbackUrl?: string };
}) {
  const session = await getServerSession(authOptions);
  if (session) {
    const raw = searchParams?.callbackUrl ?? "";
    // Only follow internal relative URLs to prevent open-redirect
    const dest = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
    redirect(dest);
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <LoginClient />
    </Suspense>
  );
}
