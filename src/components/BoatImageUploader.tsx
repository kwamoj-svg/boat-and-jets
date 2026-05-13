"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, ImageIcon, Loader2, Link as LinkIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface BoatImageUploaderProps {
  /** Hidden form field name that will hold the JSON array of URLs */
  name?: string;
  /** Initial image URLs */
  initialUrls?: string[];
  /** Bucket folder prefix — e.g. "user-id/boat-slug" */
  folderPath?: string;
  /** Max number of images */
  maxImages?: number;
}

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const BUCKET = "boat-images";

export function BoatImageUploader({
  name = "images_json",
  initialUrls = [],
  folderPath = "uploads",
  maxImages = 10,
}: BoatImageUploaderProps) {
  const [urls, setUrls] = useState<string[]>(initialUrls);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (urls.length + files.length > maxImages) {
        setError(`Maximal ${maxImages} Bilder erlaubt.`);
        return;
      }

      setError(null);
      setUploading(true);

      const supabase = createClient();
      const newUrls: string[] = [];

      for (const file of files) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          setError(`${file.name}: Nur JPG/PNG/WebP/GIF erlaubt.`);
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          setError(`${file.name}: Max 8 MB pro Bild.`);
          continue;
        }

        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const fname = `${folderPath}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(fname, file, {
            cacheControl: "31536000",
            upsert: false,
            contentType: file.type,
          });

        if (upErr) {
          setError(`Upload fehlgeschlagen: ${upErr.message}`);
          continue;
        }

        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(fname);
        if (pub?.publicUrl) newUrls.push(pub.publicUrl);
      }

      setUrls((prev) => [...prev, ...newUrls]);
      setUploading(false);
    },
    [urls.length, maxImages, folderPath]
  );

  function removeUrl(idx: number) {
    setUrls((prev) => prev.filter((_, i) => i !== idx));
  }

  function moveUrl(from: number, to: number) {
    setUrls((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  function addManualUrl() {
    const u = urlInput.trim();
    if (!u) return;
    try {
      new URL(u);
    } catch {
      setError("Ungültige URL");
      return;
    }
    if (urls.length >= maxImages) {
      setError(`Maximal ${maxImages} Bilder erlaubt.`);
      return;
    }
    setUrls((prev) => [...prev, u]);
    setUrlInput("");
    setShowUrlInput(false);
    setError(null);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/")
    );
    if (files.length > 0) void uploadFiles(files);
  }

  return (
    <div className="space-y-4">
      {/* Hidden field that submits the URL list as JSON */}
      <input type="hidden" name={name} value={JSON.stringify(urls)} />

      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
          transition-colors
          ${
            dragOver
              ? "border-gold bg-gold/5"
              : "border-white/20 bg-white/[0.02] hover:border-gold/40 hover:bg-white/[0.04]"
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length > 0) void uploadFiles(files);
            e.target.value = "";
          }}
          className="hidden"
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-gray-300">
            <Loader2 className="w-6 h-6 animate-spin text-gold" />
            <p className="text-sm">Lade hoch...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-gold/60" />
            <p className="text-sm text-white">
              Bilder hier ablegen oder klicken zum Auswählen
            </p>
            <p className="text-xs text-gray-500">
              JPG, PNG, WebP, GIF — max. 8 MB pro Datei, max. {maxImages} Bilder
            </p>
          </div>
        )}
      </div>

      {/* URL input toggle */}
      <div className="flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={() => setShowUrlInput((v) => !v)}
          className="text-gray-400 hover:text-gold flex items-center gap-1.5 transition-colors"
        >
          <LinkIcon className="w-3 h-3" />
          {showUrlInput ? "Abbrechen" : "URL stattdessen einfügen"}
        </button>
        <span className="text-gray-500">
          {urls.length} / {maxImages} Bilder
        </span>
      </div>

      {showUrlInput && (
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com/bild.jpg"
            className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gold/50"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addManualUrl();
              }
            }}
          />
          <button
            type="button"
            onClick={addManualUrl}
            className="px-4 py-2 bg-gold/80 hover:bg-gold text-navy text-sm font-medium rounded-lg transition-colors"
          >
            Hinzufügen
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2">
          {error}
        </p>
      )}

      {/* Image grid */}
      {urls.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {urls.map((url, idx) => (
            <div
              key={url + idx}
              className="relative group aspect-square rounded-lg overflow-hidden bg-white/5 border border-white/10"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Bild ${idx + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.opacity = "0.3";
                }}
              />
              {idx === 0 && (
                <span className="absolute top-1 left-1 text-[10px] bg-gold text-navy px-1.5 py-0.5 rounded font-semibold">
                  COVER
                </span>
              )}
              <button
                type="button"
                onClick={() => removeUrl(idx)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 hover:bg-red-500 text-white flex items-center justify-center transition-colors"
                aria-label="Entfernen"
              >
                <X className="w-3 h-3" />
              </button>
              <div className="absolute bottom-1 left-1 right-1 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                {idx > 0 && (
                  <button
                    type="button"
                    onClick={() => moveUrl(idx, idx - 1)}
                    className="w-6 h-6 rounded bg-black/70 hover:bg-gold/80 hover:text-navy text-white text-xs flex items-center justify-center"
                    aria-label="Nach vorne"
                  >
                    ←
                  </button>
                )}
                {idx < urls.length - 1 && (
                  <button
                    type="button"
                    onClick={() => moveUrl(idx, idx + 1)}
                    className="w-6 h-6 rounded bg-black/70 hover:bg-gold/80 hover:text-navy text-white text-xs flex items-center justify-center ml-auto"
                    aria-label="Nach hinten"
                  >
                    →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {urls.length === 0 && !uploading && (
        <div className="text-center py-4 text-gray-500 text-xs flex items-center justify-center gap-2">
          <ImageIcon className="w-4 h-4" />
          Noch keine Bilder. Erstes Bild wird als Cover verwendet.
        </div>
      )}
    </div>
  );
}
