import { Jimp } from "jimp";

const MASKABLE_SAFE_ZONE = 0.8;

export async function createMaskable(sourceBuffer: Buffer, size: number, bgColor: number): Promise<Buffer> {
  const image = await Jimp.read(sourceBuffer);
  const canvas = new Jimp({ width: size, height: size, color: bgColor });
  const logoSize = Math.round(size * MASKABLE_SAFE_ZONE);
  const scale = logoSize / Math.max(image.bitmap.width, image.bitmap.height);
  const newW = Math.round(image.bitmap.width * scale);
  const newH = Math.round(image.bitmap.height * scale);
  image.resize({ w: newW, h: newH });
  canvas.composite(image, Math.round((size - newW) / 2), Math.round((size - newH) / 2));
  return canvas.getBuffer("image/png");
}

export async function createMonochrome(sourceBuffer: Buffer, size: number, color: number): Promise<Buffer> {
  const image = await Jimp.read(sourceBuffer);
  const canvas = new Jimp({ width: size, height: size, color: 0x00000000 });

  const fitSize = Math.round(size * 0.8);
  const scale = fitSize / Math.max(image.bitmap.width, image.bitmap.height);
  const newW = Math.round(image.bitmap.width * scale);
  const newH = Math.round(image.bitmap.height * scale);
  image.resize({ w: newW, h: newH });

  const srcX = Math.round((size - newW) / 2);
  const srcY = Math.round((size - newH) / 2);

  const hex = color >>> 0;

  image.scan(0, 0, image.bitmap.width, image.bitmap.height, (x, y, idx) => {
    const alpha = image.bitmap.data[idx + 3];
    if (alpha > 0) {
      const canvasIdx = (srcY + y) * size * 4 + (srcX + x) * 4;
      canvas.bitmap.data[canvasIdx] = (hex >> 24) & 0xff;
      canvas.bitmap.data[canvasIdx + 1] = (hex >> 16) & 0xff;
      canvas.bitmap.data[canvasIdx + 2] = (hex >> 8) & 0xff;
      canvas.bitmap.data[canvasIdx + 3] = alpha;
    }
  });

  return canvas.getBuffer("image/png");
}
