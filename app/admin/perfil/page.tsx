"use client";

import { useSession } from "next-auth/react";
import { AvatarUpload } from "@/components/admin/AvatarUpload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Phone, ShieldCheck } from "lucide-react";

export default function PerfilAdminPage() {
  const { data: session } = useSession();
  const user = session?.user as any;

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Mi Perfil</h1>
        <p className="text-sm text-zinc-400 mt-1">Información de tu cuenta de administrador</p>
      </div>

      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <User className="h-4 w-4 text-orange-400" />
            Foto de perfil
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-5">
            <AvatarUpload size="lg" />
            <div className="space-y-1">
              <p className="text-sm text-white font-medium">{user?.name ?? "Admin"}</p>
              <p className="text-xs text-zinc-400">{user?.email ?? ""}</p>
              <p className="text-xs text-zinc-500 mt-2">
                Hacé click en la foto para cambiarla.
                <br />
                Formatos: JPG, PNG, WEBP · Máx. 2 MB
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-orange-400" />
            Datos de cuenta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">
            <User className="h-4 w-4 text-zinc-500 shrink-0" />
            <span className="text-zinc-400 w-16 shrink-0">Nombre</span>
            <span className="text-white truncate">{user?.name ?? "—"}</span>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">
            <Mail className="h-4 w-4 text-zinc-500 shrink-0" />
            <span className="text-zinc-400 w-16 shrink-0">Email</span>
            <span className="text-white truncate">{user?.email ?? "—"}</span>
          </div>

          {user?.phone && (
            <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">
              <Phone className="h-4 w-4 text-zinc-500 shrink-0" />
              <span className="text-zinc-400 w-16 shrink-0">Teléfono</span>
              <span className="text-white">{user.phone}</span>
            </div>
          )}

          <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">
            <ShieldCheck className="h-4 w-4 text-zinc-500 shrink-0" />
            <span className="text-zinc-400 w-16 shrink-0">Rol</span>
            <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-xs font-semibold text-orange-300 border border-orange-500/20">
              {user?.role ?? "ADMIN"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
