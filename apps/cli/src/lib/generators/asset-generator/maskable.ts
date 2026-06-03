import { resolveJimp } from "./dependency-resolver.js";

const MASKABLE_SAFE_ZONE = 0.8;

export async function createMaskable(sourceBuffer: Buffer, size: number, bgColor: number): Promise<Buffer> {
  const { Jimp } = await resolveJimp();
  const image = await Jimp.read(sourceBuffer);
  const canvas = new Jimp({ width: size, height: size, color: bgColor });
  const logoSize = Math.round(size * MASKABLE_SAFE_ZONE);
  image.resize({ w: logoSize, h: logoSize });
  const scale = logoSize / Math.max(image.bitmap.width, image.bitmap.height);
  const newW = Math.round(image.bitmap.width * scale);
  const newH = Math.round(image.bitmap.height * scale);
  canvas.composite(image, Math.round((size - newW) / 2), Math.round((size - newH) / 2));
  return canvas.getBuffer("image/png");
}
