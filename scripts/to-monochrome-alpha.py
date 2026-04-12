#!/usr/bin/env python3
"""
Android Adaptive Icon モノクロ変換スクリプト

グレースケールの「暗さ」を Alpha 値にマッピングすることで、
Android Adaptive Icon の monochrome スタイルに対応した画像を生成します。

変換ルール:
  暗いピクセル → Alpha 高 (不透明)
  明るいピクセル → Alpha 低 (透明)

使い方:
  python scripts/to-monochrome-alpha.py <input> <output> [options]

例:
  python scripts/to-monochrome-alpha.py assets/icon.png assets/icon-monochrome.png
  python scripts/to-monochrome-alpha.py assets/icon.png out.png --color 255 255 255
  python scripts/to-monochrome-alpha.py assets/icon.png out.png --gamma 1.5
"""

import argparse
import sys

try:
    from PIL import Image
except ImportError:
    print("Error: Pillow が見つかりません。`pip install Pillow` でインストールしてください。", file=sys.stderr)
    sys.exit(1)

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False


def convert_numpy(img: "Image.Image", color: tuple[int, int, int], gamma: float) -> "Image.Image":
    rgba = np.array(img.convert("RGBA"), dtype=np.float32)

    # 輝度 (Rec.709) を計算
    luminance = (
        rgba[:, :, 0] * 0.2126
        + rgba[:, :, 1] * 0.7152
        + rgba[:, :, 2] * 0.0722
    )

    # 暗さ = 1 - 輝度 (0〜255 で正規化済み)
    darkness = 1.0 - (luminance / 255.0)

    # ガンマ補正でコントラストを調整
    if gamma != 1.0:
        darkness = np.power(np.clip(darkness, 0.0, 1.0), 1.0 / gamma)

    # 元の Alpha と合成
    orig_alpha = rgba[:, :, 3] / 255.0
    final_alpha = np.clip(darkness * orig_alpha * 255.0, 0, 255).astype(np.uint8)

    # 出力画像を組み立て
    result = np.zeros((*img.size[::-1], 4), dtype=np.uint8)
    result[:, :, 0] = color[0]
    result[:, :, 1] = color[1]
    result[:, :, 2] = color[2]
    result[:, :, 3] = final_alpha

    return Image.fromarray(result, "RGBA")


def convert_pure_pil(img: "Image.Image", color: tuple[int, int, int], gamma: float) -> "Image.Image":
    rgba = img.convert("RGBA")
    grayscale = img.convert("L")

    result = Image.new("RGBA", img.size)
    rgba_pixels = rgba.load()
    gray_pixels = grayscale.load()
    result_pixels = result.load()

    width, height = img.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = rgba_pixels[x, y]
            gray = gray_pixels[x, y]

            # 暗さ (0〜255)
            darkness = 255 - gray

            # ガンマ補正
            if gamma != 1.0:
                darkness = int(((darkness / 255.0) ** (1.0 / gamma)) * 255)

            # 元 Alpha と合成
            final_alpha = int(darkness * a / 255)
            result_pixels[x, y] = (*color, final_alpha)

    return result


def main() -> None:
    parser = argparse.ArgumentParser(
        description="グレースケールの暗さを Alpha 値にマッピングして Android Adaptive Icon 用モノクロ画像を生成する",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("input", help="入力画像パス (PNG 推奨)")
    parser.add_argument("output", help="出力画像パス (.png)")
    parser.add_argument(
        "--color",
        nargs=3,
        type=int,
        default=[255, 255, 255],
        metavar=("R", "G", "B"),
        help="前景色 RGB (デフォルト: 255 255 255 = 白)",
    )
    parser.add_argument(
        "--gamma",
        type=float,
        default=1.0,
        metavar="GAMMA",
        help="ガンマ値でコントラストを調整 (>1.0 で暗部を強調, デフォルト: 1.0)",
    )

    args = parser.parse_args()

    color = tuple(args.color)
    for c in color:
        if not (0 <= c <= 255):
            parser.error(f"--color の値は 0〜255 の範囲で指定してください: {c}")

    if args.gamma <= 0:
        parser.error("--gamma は正の値を指定してください")

    try:
        img = Image.open(args.input)
    except FileNotFoundError:
        print(f"Error: ファイルが見つかりません: {args.input}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: 画像を開けませんでした: {e}", file=sys.stderr)
        sys.exit(1)

    print(f"入力: {args.input} ({img.size[0]}x{img.size[1]})")
    print(f"前景色: rgb{color}")
    print(f"ガンマ: {args.gamma}")
    print(f"エンジン: {'numpy' if HAS_NUMPY else 'pure Pillow (numpy なし)'}")

    if HAS_NUMPY:
        result = convert_numpy(img, color, args.gamma)
    else:
        result = convert_pure_pil(img, color, args.gamma)

    if not args.output.lower().endswith(".png"):
        print("Warning: 出力ファイルは PNG 形式を推奨します (Alpha チャンネルを保持するため)", file=sys.stderr)

    result.save(args.output)
    print(f"出力: {args.output}")


if __name__ == "__main__":
    main()
