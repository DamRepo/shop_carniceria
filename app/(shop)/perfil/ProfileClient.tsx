"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Camera,
  Loader2,
  X,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Loader,
  ShieldCheck,
  User,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type UserProfile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  image: string | null;
  username: string;
  role: string;
  createdAt: string;
  orderCount: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatMemberSince(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });
}

function passwordStrength(pw: string): 0 | 1 | 2 | 3 {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw) || pw.length >= 12) score++;
  return Math.min(score, 3) as 0 | 1 | 2 | 3;
}

const strengthLabel: Record<1 | 2 | 3, string> = {
  1: "Débil",
  2: "Media",
  3: "Fuerte",
};

const strengthColor: Record<1 | 2 | 3, string> = {
  1: "bg-red-500",
  2: "bg-yellow-500",
  3: "bg-green-500",
};

function roleInfo(role: string): { label: string; className: string } {
  if (role === "ADMIN")
    return {
      label: "Administrador",
      className: "text-red-400 border-red-500/40 bg-red-500/10",
    };
  if (role === "EMPLOYEE")
    return {
      label: "Empleado",
      className: "text-blue-400 border-blue-500/40 bg-blue-500/10",
    };
  return {
    label: "Cliente",
    className: "text-zinc-400 border-zinc-600/40 bg-zinc-600/10",
  };
}

const NAV_ITEMS = [
  { id: "datos", label: "Datos personales", Icon: User },
  { id: "seguridad", label: "Seguridad", Icon: Lock },
  { id: "cuenta", label: "Mi cuenta", Icon: ShieldCheck },
] as const;

const MAX_BYTES = 2 * 1024 * 1024;

// ── Component ─────────────────────────────────────────────────────────────────

export function ProfileClient({ user }: { user: UserProfile }) {
  const { update } = useSession();
  const badge = roleInfo(user.role);

  // ── Active section (IntersectionObserver) ────────────────────────────────
  const [activeSection, setActiveSection] = useState<string>("datos");

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    NAV_ITEMS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(id);
        },
        { rootMargin: "0px 0px -70% 0px", threshold: 0.1 }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ── Avatar ────────────────────────────────────────────────────────────────
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [localImage, setLocalImage] = useState<string | null>(user.image);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const displaySrc = avatarPreview ?? localImage;

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (avatarInputRef.current) avatarInputRef.current.value = "";
    if (!file) return;

    if (file.size > MAX_BYTES) {
      toast.error("La imagen no debe superar 2MB");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);

    try {
      setAvatarUploading(true);
      const form = new FormData();
      form.append("avatar", file);

      const res = await fetch("/api/user/profile/avatar", { method: "POST", body: form });
      const data = (await res.json().catch(() => null)) as {
        imageUrl?: string;
        error?: string;
      } | null;

      if (!res.ok) throw new Error(data?.error ?? "Error al subir la imagen");

      const newUrl = data?.imageUrl ?? "";
      await update({ image: newUrl });
      const bustedUrl = `${newUrl}?t=${Date.now()}`;
      setLocalImage(newUrl);
      setAvatarPreview(bustedUrl);
      toast.success("Foto actualizada correctamente");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir la imagen");
      setAvatarPreview(null);
    } finally {
      setAvatarUploading(false);
      URL.revokeObjectURL(objectUrl);
    }
  }

  async function handleAvatarDelete() {
    if (!confirm("¿Eliminar tu foto de perfil?")) return;
    try {
      setAvatarUploading(true);
      const res = await fetch("/api/user/profile/avatar", { method: "DELETE" });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Error al eliminar");

      await update({ image: null });
      setLocalImage(null);
      setAvatarPreview(null);
      toast.success("Foto eliminada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar la imagen");
    } finally {
      setAvatarUploading(false);
    }
  }

  // ── Profile form ──────────────────────────────────────────────────────────
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  const [phone, setPhone] = useState(user.phone);
  const [profileErrors, setProfileErrors] = useState<
    Partial<Record<"name" | "username" | "phone", string>>
  >({});
  const [profileSaving, setProfileSaving] = useState(false);

  const hasChanges =
    name !== user.name || username !== user.username || phone !== user.phone;

  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");

  useEffect(() => {
    const trimmed = username.trim();
    if (!trimmed || trimmed === user.username) {
      setUsernameStatus("idle");
      return;
    }
    if (trimmed.length < 3) {
      setUsernameStatus("idle");
      return;
    }
    setUsernameStatus("checking");
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/user/check-username?u=${encodeURIComponent(trimmed)}`
        );
        const data = (await res.json()) as { available: boolean };
        setUsernameStatus(data.available ? "available" : "taken");
      } catch {
        setUsernameStatus("idle");
      }
    }, 500);
    return () => clearTimeout(t);
  }, [username, user.username]);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    const errors: typeof profileErrors = {};

    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      errors.name = "Entre 2 y 50 caracteres";
    }
    const trimmedUsername = username.trim();
    if (trimmedUsername && (trimmedUsername.length < 3 || trimmedUsername.length > 20)) {
      errors.username = "Entre 3 y 20 caracteres";
    } else if (trimmedUsername && !/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      errors.username = "Solo letras, números y guiones bajos";
    } else if (trimmedUsername !== user.username && usernameStatus === "taken") {
      errors.username = "Ese nombre de usuario ya está en uso";
    }

    if (Object.keys(errors).length) {
      setProfileErrors(errors);
      return;
    }
    setProfileErrors({});

    try {
      setProfileSaving(true);
      const body: Record<string, string | null> = {};
      if (name !== user.name) body.name = trimmedName;
      if (username !== user.username) body.username = trimmedUsername || null;
      if (phone !== user.phone) body.phone = phone.trim() || null;

      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        user?: { name: string; username: string | null };
      } | null;

      if (!res.ok) throw new Error(data?.error ?? "Error al guardar");

      await update({ name: trimmedName, username: trimmedUsername || null });
      toast.success("Datos actualizados correctamente");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar los datos");
    } finally {
      setProfileSaving(false);
    }
  }

  // ── Password form ─────────────────────────────────────────────────────────
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwErrors, setPwErrors] = useState<
    Partial<Record<"currentPw" | "newPw" | "confirmPw", string>>
  >({});
  const [pwSaving, setPwSaving] = useState(false);

  const pwStrength = passwordStrength(newPw);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    const errors: typeof pwErrors = {};

    if (!currentPw) errors.currentPw = "Ingresá tu contraseña actual";
    if (newPw.length < 8) errors.newPw = "Mínimo 8 caracteres";
    else if (!/\d/.test(newPw)) errors.newPw = "Debe incluir al menos un número";
    else if (newPw === currentPw) errors.newPw = "Debe ser diferente a la actual";
    if (newPw !== confirmPw) errors.confirmPw = "Las contraseñas no coinciden";

    if (Object.keys(errors).length) {
      setPwErrors(errors);
      return;
    }
    setPwErrors({});

    try {
      setPwSaving(true);
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: currentPw,
          newPassword: newPw,
          confirmPassword: confirmPw,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        message?: string;
      } | null;

      if (!res.ok) throw new Error(data?.error ?? "Error al cambiar la contraseña");

      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      toast.success("Contraseña actualizada correctamente");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cambiar la contraseña");
    } finally {
      setPwSaving(false);
    }
  }

  // ── Shared: avatar circle ─────────────────────────────────────────────────
  function AvatarCircle({ size }: { size: "sm" | "lg" }) {
    const dim = size === "lg" ? "w-24 h-24 text-3xl" : "w-16 h-16 text-xl";
    const imgSize = size === "lg" ? 96 : 64;
    return (
      <div className="relative group flex-shrink-0">
        <button
          type="button"
          onClick={() => !avatarUploading && avatarInputRef.current?.click()}
          disabled={avatarUploading}
          className={`relative ${dim} rounded-full overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500`}
          title="Cambiar foto de perfil"
        >
          {displaySrc ? (
            <img
              src={displaySrc}
              alt={user.name || "Avatar"}
              className="object-cover w-full h-full rounded-full"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-red-600 text-white font-semibold select-none">
              {getInitials(user.name || user.email)}
            </div>
          )}
          {!avatarUploading && (
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-0.5">
              <Camera className={`${size === "lg" ? "h-6 w-6" : "h-5 w-5"} text-white`} />
            </div>
          )}
          {avatarUploading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            </div>
          )}
        </button>
        {(localImage || avatarPreview) && !avatarUploading && (
          <button
            type="button"
            onClick={handleAvatarDelete}
            title="Eliminar foto"
            className="absolute -top-1 -right-1 rounded-full bg-red-600 p-0.5 text-white hover:bg-red-700 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Hidden file input — shared across AvatarCircle instances */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleAvatarChange}
      />

      {/* ── Page header ── */}
      <div className="border-b border-zinc-800 bg-zinc-950/60">
        <div className="container mx-auto max-w-7xl px-4 py-7">
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
            <Link href="/" className="hover:text-foreground transition-colors">
              Inicio
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">Mi perfil</span>
          </nav>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Hola, {user.name || "usuario"}{" "}
            <span role="img" aria-label="saludo">
              👋
            </span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Administrá tu información personal y preferencias de cuenta.
          </p>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="container mx-auto max-w-7xl px-4 py-8">

        {/* Mobile card (visible < lg) */}
        <div className="lg:hidden mb-6">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-4">
                <AvatarCircle size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{user.name || "Sin nombre"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  <div className="mt-1.5">
                    <Badge variant="outline" className={`text-xs ${badge.className}`}>
                      {badge.label}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Two-column layout */}
        <div className="flex flex-col lg:flex-row lg:items-start gap-8">

          {/* ── Left sidebar (desktop only) ── */}
          <aside className="hidden lg:block w-80 shrink-0">
            <Card className="sticky top-24">
              <CardContent className="pt-6 pb-5">
                {/* Avatar */}
                <div className="flex flex-col items-center text-center gap-3">
                  <AvatarCircle size="lg" />

                  <div className="space-y-0.5">
                    <button
                      type="button"
                      onClick={() => !avatarUploading && avatarInputRef.current?.click()}
                      className="text-xs text-muted-foreground hover:text-red-400 transition-colors"
                    >
                      Cambiar foto
                    </button>
                  </div>

                  <div className="w-full space-y-1 pt-1">
                    <p className="font-semibold text-base truncate">
                      {user.name || "Sin nombre"}
                    </p>
                    {user.username && (
                      <p className="text-sm text-muted-foreground">@{user.username}</p>
                    )}
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    <div className="flex justify-center pt-1">
                      <Badge variant="outline" className={`text-xs ${badge.className}`}>
                        {badge.label}
                      </Badge>
                    </div>
                  </div>

                  <div className="w-full space-y-1 text-center pt-1">
                    <p className="text-xs text-muted-foreground capitalize">
                      Miembro desde {formatMemberSince(user.createdAt)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user.orderCount}{" "}
                      {user.orderCount === 1 ? "pedido realizado" : "pedidos realizados"}
                    </p>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Internal nav */}
                <nav className="space-y-1">
                  {NAV_ITEMS.map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => scrollToSection(id)}
                      className={[
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left",
                        activeSection === id
                          ? "bg-red-500/10 text-red-400 font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted",
                      ].join(" ")}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {label}
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </aside>

          {/* ── Right content ── */}
          <div className="flex-1 space-y-6 min-w-0">

            {/* ── Sección: Datos personales ── */}
            <section id="datos" className="scroll-mt-28">
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>Datos personales</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileSave} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Nombre */}
                      <div className="space-y-1.5">
                        <Label htmlFor="name">Nombre completo</Label>
                        <Input
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Tu nombre"
                          maxLength={50}
                        />
                        {profileErrors.name && (
                          <p className="text-xs text-red-500">{profileErrors.name}</p>
                        )}
                      </div>

                      {/* Username */}
                      <div className="space-y-1.5">
                        <Label htmlFor="username">Nombre de usuario</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">
                            @
                          </span>
                          <Input
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="tunombreusuario"
                            className="pl-7 pr-8"
                            maxLength={20}
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {usernameStatus === "checking" && (
                              <Loader className="h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                            {usernameStatus === "available" && (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                            {usernameStatus === "taken" && (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </div>
                        {usernameStatus === "available" && (
                          <p className="text-xs text-green-600">Disponible</p>
                        )}
                        {usernameStatus === "taken" && (
                          <p className="text-xs text-red-500">No disponible</p>
                        )}
                        {profileErrors.username && (
                          <p className="text-xs text-red-500">{profileErrors.username}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          3-20 caracteres. Solo letras, números y guiones bajos.
                        </p>
                      </div>

                      {/* Teléfono */}
                      <div className="space-y-1.5">
                        <Label htmlFor="phone">Teléfono</Label>
                        <Input
                          id="phone"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="Opcional"
                          type="tel"
                        />
                      </div>

                      {/* Email (readonly) */}
                      <div className="space-y-1.5">
                        <Label htmlFor="email">Email</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="relative">
                                <Input
                                  id="email"
                                  value={user.email}
                                  readOnly
                                  className="pr-9 cursor-not-allowed opacity-60"
                                />
                                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>El email no puede modificarse</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <Button
                        type="submit"
                        disabled={!hasChanges || profileSaving || usernameStatus === "taken"}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        {profileSaving && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Guardar cambios
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </section>

            {/* ── Sección: Seguridad ── */}
            <section id="seguridad" className="scroll-mt-28">
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>Seguridad</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Contraseña actual */}
                      <div className="space-y-1.5">
                        <Label htmlFor="currentPw">Contraseña actual</Label>
                        <div className="relative">
                          <Input
                            id="currentPw"
                            type={showCurrent ? "text" : "password"}
                            value={currentPw}
                            onChange={(e) => setCurrentPw(e.target.value)}
                            className="pr-10"
                            autoComplete="current-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrent((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            tabIndex={-1}
                          >
                            {showCurrent ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        {pwErrors.currentPw && (
                          <p className="text-xs text-red-500">{pwErrors.currentPw}</p>
                        )}
                      </div>

                      {/* Nueva contraseña */}
                      <div className="space-y-1.5">
                        <Label htmlFor="newPw">Nueva contraseña</Label>
                        <div className="relative">
                          <Input
                            id="newPw"
                            type={showNew ? "text" : "password"}
                            value={newPw}
                            onChange={(e) => setNewPw(e.target.value)}
                            className="pr-10"
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNew((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            tabIndex={-1}
                          >
                            {showNew ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        {pwErrors.newPw && (
                          <p className="text-xs text-red-500">{pwErrors.newPw}</p>
                        )}
                      </div>

                      {/* Confirmar contraseña */}
                      <div className="space-y-1.5">
                        <Label htmlFor="confirmPw">Confirmar nueva contraseña</Label>
                        <div className="relative">
                          <Input
                            id="confirmPw"
                            type={showConfirm ? "text" : "password"}
                            value={confirmPw}
                            onChange={(e) => setConfirmPw(e.target.value)}
                            className="pr-10"
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirm((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            tabIndex={-1}
                          >
                            {showConfirm ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        {pwErrors.confirmPw && (
                          <p className="text-xs text-red-500">{pwErrors.confirmPw}</p>
                        )}
                      </div>

                      {/* Barra de fortaleza (col 2, fila 2) */}
                      <div className="flex flex-col justify-center">
                        {newPw ? (
                          <div className="space-y-2 pt-6">
                            <div className="flex gap-1 h-2">
                              {([1, 2, 3] as const).map((level) => (
                                <div
                                  key={level}
                                  className={[
                                    "flex-1 rounded-full transition-colors",
                                    pwStrength >= level
                                      ? strengthColor[level]
                                      : "bg-muted",
                                  ].join(" ")}
                                />
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Fortaleza:{" "}
                              <span
                                className={
                                  pwStrength === 3
                                    ? "text-green-500"
                                    : pwStrength === 2
                                    ? "text-yellow-500"
                                    : "text-red-500"
                                }
                              >
                                {strengthLabel[pwStrength as 1 | 2 | 3]}
                              </span>
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground pt-6">
                            Mínimo 8 caracteres con al menos un número.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <Button
                        type="submit"
                        disabled={pwSaving || !currentPw || !newPw || !confirmPw}
                        variant="outline"
                      >
                        {pwSaving && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Cambiar contraseña
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </section>

            {/* ── Sección: Mi cuenta ── */}
            <section id="cuenta" className="scroll-mt-28">
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>Mi cuenta</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Email */}
                    <div className="rounded-lg border bg-muted/30 p-4 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        <p className="text-xs text-muted-foreground">Email verificado</p>
                      </div>
                      <p className="text-sm font-medium truncate">{user.email}</p>
                    </div>

                    {/* Miembro desde */}
                    <div className="rounded-lg border bg-muted/30 p-4 space-y-1">
                      <p className="text-xs text-muted-foreground">Miembro desde</p>
                      <p className="text-sm font-medium capitalize">
                        {formatMemberSince(user.createdAt)}
                      </p>
                    </div>

                    {/* Pedidos */}
                    <div className="rounded-lg border bg-muted/30 p-4 space-y-1">
                      <p className="text-xs text-muted-foreground">Pedidos realizados</p>
                      <p className="text-2xl font-bold">{user.orderCount}</p>
                    </div>
                  </div>

                  {/* Estado activo */}
                  <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                      </span>
                      <span className="text-sm font-medium">Cuenta activa</span>
                    </div>
                    <Badge variant="outline" className={`text-xs ${badge.className}`}>
                      {badge.label}
                    </Badge>
                  </div>

                  <Separator />

                  <p className="text-xs text-muted-foreground">
                    Si necesitás ayuda con tu cuenta,{" "}
                    <a href="/soporte" className="underline hover:text-foreground">
                      contactá soporte
                    </a>
                    .
                  </p>
                </CardContent>
              </Card>
            </section>

          </div>
        </div>
      </div>
    </>
  );
}
