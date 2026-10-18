"use client";

import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";
import { cropToAvatarDataUrl, type CropArea } from "@/lib/image";

type Props = {
  imageSrc: string;
  onCancel: () => void;
  onSave: (dataUrl: string) => void;
};

export function AvatarCropper({ imageSrc, onCancel, onSave }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<CropArea | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCropComplete = useCallback((_: CropArea, pixels: CropArea) => {
    setArea(pixels);
  }, []);

  async function save() {
    if (!area) return;
    setSaving(true);
    setError(null);
    try {
      const url = await cropToAvatarDataUrl(imageSrc, area);
      onSave(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not crop that image.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="card w-full max-w-md p-4 space-y-3 bg-[color:var(--surface)]">
        <div className="flex items-baseline justify-between">
          <h2 className="display text-lg font-semibold">Crop your photo</h2>
          <span className="text-xs text-[color:var(--muted)]">
            drag to position · zoom to adjust
          </span>
        </div>

        <div className="relative w-full aspect-square bg-black rounded-lg overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            minZoom={1}
            maxZoom={4}
          />
        </div>

        <label className="flex items-center gap-3 text-xs text-[color:var(--muted)]">
          <span className="w-10 shrink-0">zoom</span>
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-[color:var(--husky-purple)]"
          />
        </label>

        {error ? <p className="text-sm text-[color:var(--danger)]">{error}</p> : null}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="text-sm px-3 py-1.5 rounded-full border border-[color:var(--border)] hover:border-[color:var(--husky-purple)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || !area}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {saving ? "Saving…" : "Use"}
          </button>
        </div>
      </div>
    </div>
  );
}
