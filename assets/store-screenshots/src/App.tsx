import { type ChangeEvent, useLayoutEffect, useMemo, useRef, useState } from "react";

import { type FormatKey, type StoreFormat, type StoreSlide, formats, slides } from "../content";
import { StoreCanvas } from "./StoreCanvas";

type PreviewFormat = StoreFormat & { scale: number };

interface CaptureOptions {
  capture: boolean;
  formatKey: FormatKey;
  slideIndex: number;
}

function isFormatKey(value: string | null): value is FormatKey {
  return value !== null && value in formats;
}

function useCaptureOptions(): CaptureOptions {
  return useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedFormat = params.get("format");
    const formatKey = isFormatKey(requestedFormat) ? requestedFormat : "app-store";
    const requestedSlide = Number(params.get("slide") ?? 0);
    const slideIndex = Number.isInteger(requestedSlide) ? Math.min(Math.max(requestedSlide, 0), slides.length - 1) : 0;

    return { capture: params.get("capture") === "1", formatKey, slideIndex };
  }, []);
}

function CaptureView({ formatKey, slideIndex }: Pick<CaptureOptions, "formatKey" | "slideIndex">) {
  const format: PreviewFormat = { ...formats[formatKey], scale: 1 };
  document.documentElement.classList.add("capture-mode");
  document.documentElement.style.width = `${format.width}px`;
  document.documentElement.style.height = `${format.height}px`;

  return <StoreCanvas format={format} formatKey={formatKey} slide={slides[slideIndex]} />;
}

function CanvasPreview({ formatKey, slide }: { formatKey: FormatKey; slide: StoreSlide }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(0);
  const format = formats[formatKey];
  const scale = availableWidth > 0 ? Math.min(0.34, availableWidth / format.width) : 0.2;
  const previewFormat: PreviewFormat = { ...format, scale };

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => setAvailableWidth(container.getBoundingClientRect().width);
    const observer = new ResizeObserver(updateWidth);
    updateWidth();
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="flex w-full justify-center overflow-hidden rounded-lg border border-black/10 bg-[#dfe1e5]"
      ref={containerRef}
    >
      <StoreCanvas editable format={previewFormat} formatKey={formatKey} slide={slide} />
    </div>
  );
}

function Studio({ initialFormatKey }: { initialFormatKey: FormatKey }) {
  const [formatKey, setFormatKey] = useState<FormatKey>(initialFormatKey);
  const format = formats[formatKey];

  function selectFormat(event: ChangeEvent<HTMLSelectElement>) {
    const nextFormat = event.target.value;
    if (!isFormatKey(nextFormat)) return;

    setFormatKey(nextFormat);
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("format", nextFormat);
    window.history.replaceState(null, "", nextUrl);
  }

  return (
    <main className="min-h-screen bg-[#e8eaee] text-[#17181c] antialiased">
      <header className="sticky top-0 z-50 border-b border-black/10 bg-white/95 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-utility text-xs font-semibold tracking-[0.18em] text-[#c9507f]">CATALYST ASSET STUDIO</p>
            <h1 className="mt-1 text-xl font-bold">Store screenshots</h1>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-[#555b65]" htmlFor="format">
              出力サイズ
            </label>
            <select
              className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm shadow-sm focus:border-[#c9507f] focus:outline-none"
              id="format"
              onChange={selectFormat}
              value={formatKey}
            >
              {(Object.entries(formats) as [FormatKey, StoreFormat][]).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label} — {value.width}×{value.height}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1600px] px-6 py-8">
        <div className="mb-7 rounded-xl border border-black/10 bg-white px-5 py-4 text-sm leading-6 text-[#555b65] shadow-sm">
          文言・画像・アクセント色は{" "}
          <code className="rounded bg-[#f1f2f4] px-1.5 py-0.5 font-mono text-xs text-[#31343a]">content.ts</code>
          で編集できます。下の文言は直接編集して見え方を試せます（書き出しには content.ts の内容が使われます）。
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 2xl:grid-cols-3">
          {slides.map((slide, index) => (
            <section className="min-w-0 rounded-2xl border border-black/10 bg-white p-4 shadow-sm" key={slide.slug}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <span className="font-utility text-xs font-semibold tracking-widest text-[#858b95]">
                    {slide.number}
                  </span>
                  <h2 className="mt-1 font-bold">{slide.eyebrow}</h2>
                </div>
                <a
                  className="rounded-lg bg-[#202126] px-3 py-2 text-xs font-semibold text-white hover:bg-[#3a3b41] focus:outline-2 focus:outline-offset-2 focus:outline-[#c9507f]"
                  href={`?capture=1&format=${formatKey}&slide=${index}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  原寸表示
                </a>
              </div>
              <CanvasPreview formatKey={formatKey} slide={slide} />
            </section>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-[#686e78]">
          現在のプレビュー: {format.width} × {format.height}px
        </p>
      </section>
    </main>
  );
}

export function App() {
  const { capture, formatKey, slideIndex } = useCaptureOptions();
  return capture ? (
    <CaptureView formatKey={formatKey} slideIndex={slideIndex} />
  ) : (
    <Studio initialFormatKey={formatKey} />
  );
}
