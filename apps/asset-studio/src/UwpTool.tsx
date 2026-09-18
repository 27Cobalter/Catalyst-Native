import { type ChangeEvent, useEffect, useMemo, useState } from "react";

import defaultIcon from "../images/icon.png";
import { listFiles, renderFile, zip } from "../uwp";

const files = listFiles();

export function UwpTool() {
  const [source, setSource] = useState<string>(defaultIcon);
  const [transparent, setTransparent] = useState(false);
  const [background, setBackground] = useState("#c9507f");
  const [padding, setPadding] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      setImage(img);
      setError(img.naturalWidth === img.naturalHeight ? null : "正方形の画像を指定してください");
    };
    img.onerror = () => !cancelled && setError("画像を読み込めませんでした");
    img.src = source;
    return () => {
      cancelled = true;
    };
  }, [source]);

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setSource((previous) => {
      if (previous.startsWith("blob:")) URL.revokeObjectURL(previous);
      return URL.createObjectURL(file);
    });
  }

  const options = useMemo(
    () => ({ background: transparent ? null : background, padding: padding / 100 }),
    [transparent, background, padding],
  );

  async function download() {
    if (!image || error) return;
    setBusy(true);
    try {
      const entries = await Promise.all(
        files.map(async (file) => ({
          path: `Assets/${file.path}`,
          data: new Uint8Array(await (await renderFile(image, file, options)).arrayBuffer()),
        })),
      );
      const url = URL.createObjectURL(zip(entries));
      const a = document.createElement("a");
      a.href = url;
      a.download = "uwp-assets.zip";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-[1600px] px-6 py-8">
      <div className="mb-7 flex flex-wrap items-end gap-6 rounded-xl border border-black/10 bg-white px-5 py-4 text-sm shadow-sm">
        <label className="flex flex-col gap-1 font-medium text-[#555b65]">
          アイコン（正方形 PNG）
          <input accept="image/*" onChange={selectFile} type="file" />
        </label>
        <label className="flex items-center gap-2 font-medium text-[#555b65]">
          <input checked={transparent} onChange={(e) => setTransparent(e.target.checked)} type="checkbox" />
          背景を透過
        </label>
        <label className="flex items-center gap-2 font-medium text-[#555b65]">
          背景色
          <input
            disabled={transparent}
            onChange={(e) => setBackground(e.target.value)}
            type="color"
            value={background}
          />
        </label>
        <label className="flex items-center gap-2 font-medium text-[#555b65]">
          タイルの余白 {padding}%
          <input
            max={40}
            min={0}
            onChange={(e) => setPadding(Number(e.target.value))}
            type="range"
            value={padding}
          />
        </label>
        <button
          className="rounded-lg bg-[#202126] px-4 py-2 text-xs font-semibold text-white hover:bg-[#3a3b41] disabled:opacity-40"
          disabled={!image || !!error || busy}
          onClick={download}
          type="button"
        >
          {busy ? "生成中…" : `ZIP をダウンロード（${files.length} 枚）`}
        </button>
        {error && <p className="w-full text-[#c0392b]">{error}</p>}
      </div>
      <p className="mb-4 text-sm text-[#686e78]">
        Square44x44Logo・StoreLogo・LockScreenLogo は余白なし、タイル / Wide / SplashScreen
        はアイコンを中央に配置します。ZIP の <code className="font-mono">Assets/</code> を UWP プロジェクトへコピーしてください。
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        {image &&
          !error &&
          files
            .filter((f) => f.path.includes("scale-200") || f.path.includes("scale-100"))
            .map((file) => (
              <Preview file={file} image={image} key={file.path} options={options} />
            ))}
      </div>
    </section>
  );
}

function Preview({
  file,
  image,
  options,
}: {
  file: (typeof files)[number];
  image: HTMLImageElement;
  options: { background: string | null; padding: number };
}) {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    let revoked: string | undefined;
    let cancelled = false;
    renderFile(image, file, options).then((blob) => {
      if (cancelled) return;
      revoked = URL.createObjectURL(blob);
      setUrl(revoked);
    });
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [image, file, options]);

  return (
    <figure className="rounded-lg border border-black/10 bg-white p-3">
      <div className="flex h-24 items-center justify-center bg-[repeating-conic-gradient(#e5e7eb_0_25%,#fff_0_50%)] bg-[length:12px_12px]">
        {url && <img alt={file.path} className="max-h-full max-w-full" src={url} />}
      </div>
      <figcaption className="mt-2 break-all text-[10px] text-[#686e78]">
        {file.path} ({file.width}×{file.height})
      </figcaption>
    </figure>
  );
}
