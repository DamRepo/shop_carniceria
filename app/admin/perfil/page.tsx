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
        <h1 className="text-2xl font-bold text-foreground">Mi Perfil</h1>
        <p className="text-sm text-muted-foreground mt-1">Información de tu cuenta de administrador</p>
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-foreground flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Foto de perfil
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-5">
            <AvatarUpload size="lg" />
            <div className="space-y-1">
              <p className="text-sm text-foreground font-medium">{user?.name ?? "Admin"}</p>
              <p className="text-xs text-muted-foreground">{user?.email ?? ""}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Hacé click en la foto para cambiarla.
                <br />
                Formatos: JPG, PNG, WEBP · Máx. 2 MB
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-foreground flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Datos de cuenta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/60 px-3 py-2">
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground w-16 shrink-0">Nombre</span>
            <span className="text-foreground truncate">{user?.name ?? "—"}</span>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/60 px-3 py-2">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground w-16 shrink-0">Email</span>
            <span className="text-foreground truncate">{user?.email ?? "—"}</span>
          </div>

          {user?.phone && (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/60 px-3 py-2">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground w-16 shrink-0">Teléfono</span>
              <span className="text-foreground">{user.phone}</span>
            </div>
          )}

          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/60 px-3 py-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground w-16 shrink-0">Rol</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary border border-primary/20">
              {user?.role ?? "ADMIN"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
