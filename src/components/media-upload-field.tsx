import { useId, useState, type ChangeEvent } from "react";
import { ImagePlus, Music2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";

import { Input } from "@/components/ui/input";
import { getPublicMediaUrl } from "@/lib/game-config";
import { uploadGameMedia } from "@/lib/setup.functions";

type MediaUploadKind = "bride_face" | "groom_face" | "background_music" | "milestone";

interface MediaUploadFieldProps {
  kind: MediaUploadKind;
  label: string;
  path: string;
  shape?: "circle" | "square" | "audio";
  onPathChange: (path: string) => void;
  onBusyChange?: (busy: boolean) => void;
}

export function MediaUploadField({
  kind,
  label,
  path,
  shape = "square",
  onPathChange,
  onBusyChange,
}: MediaUploadFieldProps) {
  const id = useId();
  const upload = useServerFn(uploadGameMedia);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const isAudio = shape === "audio";
  const mediaUrl = path ? getPublicMediaUrl(path) : null;

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.set("kind", kind);
    formData.set("file", file);
    setUploading(true);
    setError("");
    onBusyChange?.(true);

    try {
      const result = await upload({ data: formData });
      onPathChange(result.path);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "The file could not be uploaded.");
    } finally {
      setUploading(false);
      onBusyChange?.(false);
      input.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      {isAudio ? (
        mediaUrl ? (
          <audio controls src={mediaUrl} className="w-full" />
        ) : (
          <div className="flex min-h-16 items-center gap-3 rounded-md border border-dashed border-border bg-background px-4 text-sm text-muted-foreground">
            <Music2 aria-hidden="true" className="size-5 text-marigold" />
            No music selected
          </div>
        )
      ) : (
        <div
          className={
            shape === "circle"
              ? "grid size-28 place-items-center overflow-hidden rounded-full border border-wedding-gold/80 bg-secondary"
              : "grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-md border border-wedding-gold/70 bg-secondary"
          }
        >
          {mediaUrl ? (
            <img src={mediaUrl} alt={label} className="size-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-sm text-maroon">
              <ImagePlus aria-hidden="true" className="size-6" />
              <span>{path ? "Preview unavailable" : "No photo selected"}</span>
            </div>
          )}
        </div>
      )}
      <Input
        id={id}
        type="file"
        accept={isAudio ? "audio/mpeg,audio/mp4,audio/wav,audio/ogg,audio/webm" : "image/jpeg,image/png,image/webp,image/avif"}
        disabled={uploading}
        onChange={handleChange}
        className="h-auto min-h-11 bg-background py-2 file:mr-3 file:rounded-sm file:bg-secondary file:px-3 file:py-1 file:text-foreground"
      />
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {uploading ? "Uploading…" : error || (path ? "File uploaded" : "Choose a file")}
      </p>
    </div>
  );
}