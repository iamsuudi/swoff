import { readFileSync } from "fs";
import { resolveJimp, resolveResvg } from "./dependency-resolver.js";

export async function rasterizeSource(
  sourcePath: string,
  targetSize: number,
): Promise<Buffer> {
  const ext = sourcePath.toLowerCase().split(".").pop() || "";
  if (ext === "svg") return rasterizeSvg(sourcePath, targetSize);
  return rasterizeRaster(sourcePath, targetSize);
}

async function rasterizeSvg(sourcePath: string, targetSize: number): Promise<Buffer> {
  const { initWasm, Resvg, wasmBuffer } = await resolveResvg();
  await initWasm(wasmBuffer);

  const svg = readFileSync(sourcePath, "utf-8");
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width" as const, value: targetSize },
    background: "rgba(0,0,0,0)",
  });
  return Buffer.from(resvg.render().asPng());
}

async function rasterizeRaster(sourcePath: string, targetSize: number): Promise<Buffer> {
  const { Jimp } = await resolveJimp();
  const image = await Jimp.read(sourcePath);
  const w = image.bitmap.width;
  const h = image.bitmap.height;
  const scale = targetSize / Math.max(w, h);
  const newW = Math.round(w * scale);
  const newH = Math.round(h * scale);
  image.resize({ w: newW, h: newH });
  const canvas = new Jimp({ width: targetSize, height: targetSize, color: 0x00000000 });
  canvas.composite(image, Math.round((targetSize - newW) / 2), Math.round((targetSize - newH) / 2));
  return canvas.getBuffer("image/png");
}
