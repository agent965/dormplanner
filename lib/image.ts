// Client-side avatar helper: resize an uploaded image file to a square JPEG
// data URL that fits comfortably in a TEXT column. Keeps everything in-browser,
// no upload service needed for the hackathon.

const MAX_DIM = 256;
const QUALITY = 0.82;

export async function fileToAvatarDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }
  const bitmap = await loadBitmap(file);
  const { canvas, ctx } = makeSquareCanvas(bitmap, MAX_DIM);
  ctx.drawImage(
    bitmap,
    ...cropToSquare(bitmap),
    0,
    0,
    MAX_DIM,
    MAX_DIM
  );
  const dataUrl = canvas.toDataURL("image/jpeg", QUALITY);
  if (dataUrl.length > 200_000) {
    throw new Error("Image is too large even after resizing. Try a smaller file.");
  }
  return dataUrl;
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {}
  }
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that image."));
    img.src = URL.createObjectURL(file);
  });
}

function makeSquareCanvas(_src: ImageBitmap | HTMLImageElement, size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported in this browser.");
  return { canvas, ctx };
}

function cropToSquare(src: ImageBitmap | HTMLImageElement): [number, number, number, number] {
  const w = "width" in src ? src.width : (src as HTMLImageElement).naturalWidth;
  const h = "height" in src ? src.height : (src as HTMLImageElement).naturalHeight;
  const side = Math.min(w, h);
  const sx = Math.floor((w - side) / 2);
  const sy = Math.floor((h - side) / 2);
  return [sx, sy, side, side];
}
