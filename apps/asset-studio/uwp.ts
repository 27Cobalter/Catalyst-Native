export interface UwpAsset {
  /** Base file name, e.g. Square150x150Logo */
  name: string;
  /** Size at 100% scale */
  width: number;
  height: number;
  /** Scale percentages (scale-XXX) to emit */
  scales: number[];
  /** Extra fixed-size variants (targetsize-N), emitted as square images */
  targetSizes?: number[];
  /** Fraction of the shorter side the icon occupies (1 = full bleed) */
  fill: number;
  /** Whether the user-selected background color is painted */
  background: boolean;
}

const scales = [100, 125, 150, 200, 400];

export const uwpAssets: UwpAsset[] = [
  {
    name: "Square44x44Logo",
    width: 44,
    height: 44,
    scales,
    targetSizes: [16, 24, 32, 48, 256],
    fill: 1,
    background: false,
  },
  { name: "Square71x71Logo", width: 71, height: 71, scales, fill: 0.65, background: true },
  { name: "Square150x150Logo", width: 150, height: 150, scales, fill: 0.65, background: true },
  { name: "Wide310x150Logo", width: 310, height: 150, scales, fill: 0.65, background: true },
  { name: "Square310x310Logo", width: 310, height: 310, scales, fill: 0.65, background: true },
  { name: "StoreLogo", width: 50, height: 50, scales, fill: 1, background: false },
  { name: "SplashScreen", width: 620, height: 300, scales, fill: 0.5, background: true },
  { name: "LockScreenLogo", width: 24, height: 24, scales: [100, 200], fill: 1, background: false },
];

export interface UwpFile {
  path: string;
  width: number;
  height: number;
  asset: UwpAsset;
}

export function listFiles(): UwpFile[] {
  return uwpAssets.flatMap((asset) => [
    ...asset.scales.map((scale) => ({
      path: `${asset.name}.scale-${scale}.png`,
      width: Math.round((asset.width * scale) / 100),
      height: Math.round((asset.height * scale) / 100),
      asset,
    })),
    ...(asset.targetSizes ?? []).flatMap((size) => [
      { path: `${asset.name}.targetsize-${size}.png`, width: size, height: size, asset },
      { path: `${asset.name}.targetsize-${size}_altform-unplated.png`, width: size, height: size, asset },
    ]),
  ]);
}

function canvasOf(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas is unavailable");
  ctx.imageSmoothingQuality = "high";
  return [canvas, ctx];
}

/** Halve repeatedly so large sources are averaged instead of point-sampled (avoids jaggies). */
function downscale(image: HTMLImageElement, size: number): CanvasImageSource {
  let source: CanvasImageSource = image;
  let current = image.naturalWidth;
  while (current / 2 > size) {
    current = Math.max(Math.ceil(current / 2), Math.ceil(size));
    const [canvas, ctx] = canvasOf(current, current);
    ctx.drawImage(source, 0, 0, current, current);
    source = canvas;
  }
  return source;
}

export function renderFile(
  image: HTMLImageElement,
  file: UwpFile,
  options: { background: string | null; padding: number },
): Promise<Blob> {
  const [canvas, ctx] = canvasOf(file.width, file.height);

  if (file.asset.background && options.background) {
    ctx.fillStyle = options.background;
    ctx.fillRect(0, 0, file.width, file.height);
  }

  // padding only shrinks assets that are already padded; full-bleed ones stay full-bleed
  const fill = file.asset.fill === 1 ? 1 : file.asset.fill * (1 - options.padding);
  const side = Math.min(file.width, file.height) * fill;
  ctx.drawImage(downscale(image, side), (file.width - side) / 2, (file.height - side) / 2, side, side);

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("PNG encoding failed"))), "image/png"),
  );
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (const byte of data) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Minimal store-only (uncompressed) ZIP writer; PNGs are already compressed. */
export function zip(entries: { path: string; data: Uint8Array }[]): Blob {
  const encoder = new TextEncoder();
  const parts: BlobPart[] = [];
  const central: BlobPart[] = [];
  let offset = 0;
  let centralSize = 0;

  for (const { path, data } of entries) {
    const name = encoder.encode(path);
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // UTF-8 names
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, name.length, true);
    parts.push(local.buffer, name, data as BlobPart);

    const entry = new DataView(new ArrayBuffer(46));
    entry.setUint32(0, 0x02014b50, true);
    entry.setUint16(4, 20, true);
    entry.setUint16(6, 20, true);
    entry.setUint16(8, 0x0800, true);
    entry.setUint32(16, crc, true);
    entry.setUint32(20, data.length, true);
    entry.setUint32(24, data.length, true);
    entry.setUint16(28, name.length, true);
    entry.setUint32(42, offset, true);
    central.push(entry.buffer, name);

    centralSize += 46 + name.length;
    offset += 30 + name.length + data.length;
  }

  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);

  return new Blob([...parts, ...central, end.buffer], { type: "application/zip" });
}
