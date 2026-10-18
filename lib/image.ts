// Client-side avatar helpers: read a File into a data URL for the cropper,
// then render the user's chosen crop area into a resized JPEG that fits in a
// TEXT column. Everything stays in-browser.

const MAX_DIM = 256;
const QUALITY = 0.82;
const MAX_LEN = 200_000;

/** Read a File into a data URL (used to feed the cropper UI). */
export async function fileToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Could not read that image."));
    r.readAsDataURL(file);
  });
}

export type CropArea = { x: number; y: number; width: number; height: number };

/**
 * Draw the chosen crop area of `imageSrc` into a 256×256 JPEG data URL.
 * `crop` is in the original image's pixel space (what react-easy-crop returns
 * from onCropComplete as croppedAreaPixels).
 */
export async function cropToAvatarDataUrl(imageSrc: string, crop: CropArea): Promise<string> {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = MAX_DIM;
  canvas.height = MAX_DIM;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported in this browser.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    img,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    MAX_DIM,
    MAX_DIM
  );
  const dataUrl = canvas.toDataURL("image/jpeg", QUALITY);
  if (dataUrl.length > MAX_LEN) {
    throw new Error("Image is too large even after resizing. Try a smaller file.");
  }
  return dataUrl;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that image."));
    img.src = src;
  });
}
