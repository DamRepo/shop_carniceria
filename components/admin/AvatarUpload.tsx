"use client";

import { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Camera, Loader2, X } from "lucide-react";
import { toast } from "sonner";

interface AvatarUploadProps {
  /** "sm" → w-10 h-10 (sidebar), "lg" → w-20 h-20 (profile page) */
  size?: "sm" | "lg";
  /** Called after a successful upload or deletion with the new URL (or null) */
  onChanged?: (imageUrl: string | null) => void;
}

const MAX_BYTES = 2 * 1024 * 1024;

export function AvatarUpload({ size = "sm", onChanged }: AvatarUploadProps) {
  const { data: session, update } = useSession();
  const inputRef = useRef<HTMLInputElement>(null);

  const currentImage = (session?.user as any)?.image as string | null | undefined;
  const name = session?.user?.name ?? "Admin";

  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const dim = size === "lg" ? "w-20 h-20 text-2xl" : "w-10 h-10 text-sm";
  const overlayText = size === "lg" ? "block" : "hidden";

  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const displaySrc = preview ?? currentImage ?? null;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!inputRef.current) return;
    inputRef.current.value = "";

    if (!file) return;

    if (file.size > MAX_BYTES) {
      toast.error("La imagen no debe superar 2MB");
      return;
    }

    // Immediate preview
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    try {
      setUploading(true);

      const form = new FormData();
      form.append("avatar", file);

      const res = await fetch("/api/admin/profile/avatar", {
        method: "POST",
        body: form,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error ?? "Error al subir la imagen");
      }

      const newUrl: string = data.imageUrl;

      // Update NextAuth JWT so the new image persists in session
      await update({ image: newUrl });

      // Add cache-busting so Next/Image doesn't serve the old file
      const bustedUrl = `${newUrl}?t=${Date.now()}`;
      setPreview(bustedUrl);

      onChanged?.(newUrl);
      toast.success("Foto actualizada correctamente");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir la imagen");
      setPreview(null);
    } finally {
      setUploading(false);
      URL.revokeObjectURL(objectUrl);
    }
  }

  async function handleDelete() {
    if (!confirm("¿Eliminar tu foto de perfil?")) return;

    try {
      setUploading(true);

      const res = await fetch("/api/admin/profile/avatar", { method: "DELETE" });
      const data = await res.json().catch(() => null);

      if (!res.ok) throw new Error(data?.error ?? "Error al eliminar");

      await update({ image: null });
      setPreview(null);
      onChanged?.(null);
      toast.success("Foto eliminada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar la imagen");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="relative group flex-shrink-0">
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Avatar circle */}
      <button
        type="button"
        onClick={() => !uploading && inputRef.current?.click()}
        className={`relative ${dim} rounded-full overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500`}
        title="Cambiar foto de perfil"
        disabled={uploading}
      >
        {displaySrc ? (
          <img
            src={displaySrc}
            alt={name}
            className="object-cover w-full h-full rounded-full"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-orange-500 font-semibold text-white select-none">
            {initials}
          </div>
        )}

        {/* Overlay */}
        {!uploading && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-0.5">
            <Camera className={`${size === "lg" ? "h-6 w-6" : "h-4 w-4"} text-white`} />
            <span className={`${overlayText} text-white text-xs font-medium leading-tight text-center px-1`}>
              Cambiar foto
            </span>
          </div>
        )}

        {/* Spinner */}
        {uploading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <Loader2 className={`${size === "lg" ? "h-6 w-6" : "h-4 w-4"} text-white animate-spin`} />
          </div>
        )}
      </button>

      {/* Delete button — only visible when there's a photo, only on lg */}
      {size === "lg" && (currentImage || preview) && !uploading && (
        <button
          type="button"
          onClick={handleDelete}
          title="Eliminar foto"
          className="absolute -top-1 -right-1 rounded-full bg-red-600 p-0.5 text-white hover:bg-red-700 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
