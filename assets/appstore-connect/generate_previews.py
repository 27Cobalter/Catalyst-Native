#!/usr/bin/env python3
"""
App Store Connect promotional flyer generator for Catalyst.
Design reference: assets/store-banner/index.html (white-base, soft pink × blue)
"""

import math
import os
import random
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# ─── Canvas ───────────────────────────────────────────────────────────────────
CANVAS_W = 1284
CANVAS_H = 2778

# ─── Color Palette (from store-banner/index.html) ────────────────────────────
BG_BASE     = (255, 250, 251)   # #fffafb  soft white
BG_MID      = (255, 246, 248)   # #fff6f8
BG_BOTTOM   = (248, 247, 255)   # #f8f7ff  faint lavender

ACCENT      = (242, 191, 208)   # #f2bfd0  soft pink (blob color)
ACCENT_S    = (232, 157, 184)   # #e89db8  stronger pink (badge / line)
TINT        = (111, 143, 220)   # #6f8fdc  blue tint
TINT_SOFT   = (223, 232, 255)   # #dfe8ff

TEXT_MAIN   = (47, 39, 51)      # #2f2733  dark purplish
TEXT_MUTED  = (125, 113, 129)   # #7d7181
TEXT_TINT   = (90, 120, 200)    # slightly brighter blue for sub-labels

BORDER      = (242, 231, 236)   # #f2e7ec  card border
PHONE_BODY  = (30, 26, 34)      # #1e1a22  dark phone frame

# Per-screen definitions
SCREENS = [
    {
        "src": "IMG_1164.PNG",
        "out": "preview_1_timeline.png",
        "label": "タイムライン",
        "headline": "フィードで\n世界と繋がろう",
        "sub": "フォロー中・グローバルの2つのフィードで\nVRフレンドの投稿をリアルタイムに確認",
        "accent": ACCENT_S,
        "blob1": (*ACCENT, 180),
        "blob2": (*TINT, 100),
    },
    {
        "src": "IMG_1165.PNG",
        "out": "preview_2_profile.png",
        "label": "プロフィール",
        "headline": "あなたの世界を\nひとつの場所に",
        "sub": "投稿・ギャラリー・アルバムをまとめて管理。\nプロフィールをあなたらしくカスタマイズ",
        "accent": TINT,
        "blob1": (*TINT_SOFT, 220),
        "blob2": (*ACCENT, 120),
    },
    {
        "src": "IMG_1166.PNG",
        "out": "preview_3_gallery.png",
        "label": "ギャラリー",
        "headline": "思い出を、\n美しいグリッドで",
        "sub": "VRでの体験をフォトギャラリーに保存。\n作品を一覧で美しく振り返る",
        "accent": (180, 140, 220),
        "blob1": (220, 200, 255, 180),
        "blob2": (*ACCENT, 130),
    },
    {
        "src": "IMG_1167.PNG",
        "out": "preview_4_contest.png",
        "label": "コンテスト",
        "headline": "コンテストで\nみんなと盛り上がろう",
        "sub": "開催中のコンテストに参加・投票。\n作品を投稿してコミュニティと繋がる",
        "accent": (220, 150, 80),
        "blob1": (255, 230, 180, 200),
        "blob2": (*ACCENT, 140),
    },
]

# ─── Fonts ────────────────────────────────────────────────────────────────────
FONT_W7 = "/System/Library/Fonts/ヒラギノ角ゴシック W7.ttc"
FONT_W5 = "/System/Library/Fonts/ヒラギノ角ゴシック W5.ttc"
FONT_W3 = "/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc"

def load_font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()


# ─── Background helpers ───────────────────────────────────────────────────────

def make_background():
    """135-degree linear gradient: BG_BASE → BG_MID → BG_BOTTOM."""
    img = Image.new("RGB", (CANVAS_W, CANVAS_H))
    # Diagonal: blend along y (simplified to vertical for PIL)
    for y in range(CANVAS_H):
        t = y / (CANVAS_H - 1)
        if t < 0.45:
            t2 = t / 0.45
            c = tuple(int(BG_BASE[i] + (BG_MID[i] - BG_BASE[i]) * t2) for i in range(3))
        else:
            t2 = (t - 0.45) / 0.55
            c = tuple(int(BG_MID[i] + (BG_BOTTOM[i] - BG_MID[i]) * t2) for i in range(3))
        ImageDraw.Draw(img).line([(0, y), (CANVAS_W, y)], fill=c)
    return img.convert("RGBA")


def soft_blob(canvas_size, cx, cy, radius, rgba):
    """Large soft blurred circle."""
    layer = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    r, g, b, a = rgba
    d.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=(r, g, b, a))
    return layer.filter(ImageFilter.GaussianBlur(radius * 0.55))


# ─── Text helpers ─────────────────────────────────────────────────────────────

def text_size(draw, text, font):
    bb = draw.textbbox((0, 0), text, font=font)
    return bb[2] - bb[0], bb[3] - bb[1]


def draw_centered_text(draw, text, font, y, fill):
    w, h = text_size(draw, text, font)
    draw.text(((CANVAS_W - w) // 2, y), text, font=font, fill=fill)
    return h


# ─── Phone frame ─────────────────────────────────────────────────────────────

def draw_phone(canvas, screenshot, px, py, pw, ph):
    """Dark phone frame with rounded corners, shadow, Dynamic Island, buttons."""
    bezel = 20
    cr_out = 90
    cr_in  = 72

    fx, fy = px - bezel, py - bezel
    fw, fh = pw + bezel * 2, ph + bezel * 2

    # Drop shadow
    sh = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    sh_src = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh_src).rounded_rectangle(
        [fx + 18, fy + 26, fx + fw + 18, fy + fh + 26],
        radius=cr_out + bezel, fill=(45, 39, 51, 90))
    sh = sh_src.filter(ImageFilter.GaussianBlur(36))
    canvas = Image.alpha_composite(canvas, sh)

    # Frame body
    frm = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    fd  = ImageDraw.Draw(frm)
    fd.rounded_rectangle([fx, fy, fx + fw, fy + fh],
                          radius=cr_out, fill=(*PHONE_BODY, 255))
    # Subtle highlight ring
    fd.rounded_rectangle([fx, fy, fx + fw, fy + fh],
                          radius=cr_out, outline=(255, 255, 255, 28), width=3)
    canvas = Image.alpha_composite(canvas, frm)

    # Screenshot inside frame
    scr = screenshot.convert("RGBA")
    mask = Image.new("L", (pw, ph), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, pw - 1, ph - 1], radius=cr_in, fill=255)
    scr.putalpha(mask)
    canvas.paste(scr, (px, py), scr)

    # Dynamic Island
    di_w, di_h, di_r = 120, 32, 16
    di_x = px + (pw - di_w) // 2
    di_y = py + 16
    di_layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(di_layer).rounded_rectangle(
        [di_x, di_y, di_x + di_w, di_y + di_h],
        radius=di_r, fill=(8, 6, 10, 255))
    canvas = Image.alpha_composite(canvas, di_layer)

    # Side buttons
    btn = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    bd  = ImageDraw.Draw(btn)
    # Power (right)
    bx = fx + fw - 2
    by = fy + int(fh * 0.28)
    bd.rounded_rectangle([bx, by, bx + 8, by + 88], radius=3, fill=(42, 38, 48, 255))
    # Volume (left)
    bx2 = fx - 6
    for off in [0.21, 0.30]:
        by2 = fy + int(fh * off)
        bd.rounded_rectangle([bx2, by2, bx2 + 8, by2 + 72], radius=3, fill=(42, 38, 48, 255))
    canvas = Image.alpha_composite(canvas, btn)

    return canvas


# ─── Main ─────────────────────────────────────────────────────────────────────

def generate(screen, base_dir):
    src_path = os.path.join(base_dir, screen["src"])
    out_path = os.path.join(base_dir, screen["out"])
    accent   = screen["accent"]

    screenshot = Image.open(src_path).convert("RGB")
    sw, sh = screenshot.size

    # ── Background ─────────────────────────────────────────────────────────
    canvas = make_background()

    # Blob decorations (matching store-banner style)
    # top-left pink blob
    canvas = Image.alpha_composite(
        canvas, soft_blob((CANVAS_W, CANVAS_H), -120, -120, 680, screen["blob1"]))
    # bottom-right blue/tint blob
    canvas = Image.alpha_composite(
        canvas, soft_blob((CANVAS_W, CANVAS_H), CANVAS_W + 120, CANVAS_H + 80, 620, screen["blob2"]))
    # center-left subtle blob
    canvas = Image.alpha_composite(
        canvas, soft_blob((CANVAS_W, CANVAS_H), CANVAS_W // 3, CANVAS_H // 2, 340, (*ACCENT, 60)))

    # ── Header text section ────────────────────────────────────────────────
    font_app  = load_font(FONT_W5, 52)
    font_sub_label = load_font(FONT_W5, 40)
    font_head = load_font(FONT_W7, 110)
    font_sub  = load_font(FONT_W3, 50)

    draw = ImageDraw.Draw(canvas)

    # "Catalyst" wordmark
    cw, ch = text_size(draw, "Catalyst", font_app)
    draw.text(((CANVAS_W - cw) // 2, 90), "Catalyst", font=font_app, fill=TEXT_MAIN)

    cur_y = 90 + ch + 36

    # Feature badge pill
    label_text = screen["label"]
    lw, lh = text_size(draw, label_text, font_sub_label)
    pad_x, pad_y = 40, 18
    badge_w = lw + pad_x * 2
    badge_h = lh + pad_y * 2
    bx = (CANVAS_W - badge_w) // 2
    badge_layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    bd = ImageDraw.Draw(badge_layer)
    r, g, b = accent
    bd.rounded_rectangle([bx, cur_y, bx + badge_w, cur_y + badge_h],
                          radius=badge_h // 2, fill=(r, g, b, 38))
    bd.rounded_rectangle([bx, cur_y, bx + badge_w, cur_y + badge_h],
                          radius=badge_h // 2, outline=(r, g, b, 140), width=2)
    canvas = Image.alpha_composite(canvas, badge_layer)
    draw = ImageDraw.Draw(canvas)
    draw.text((bx + pad_x, cur_y + pad_y), label_text, font=font_sub_label, fill=(*accent, 230))

    cur_y += badge_h + 44

    # Headline (may be 2 lines)
    for line in screen["headline"].split("\n"):
        hw, hh = text_size(draw, line, font_head)
        draw.text(((CANVAS_W - hw) // 2, cur_y), line, font=font_head, fill=TEXT_MAIN)
        cur_y += hh + 12
    cur_y += 16

    # Thin accent separator line
    line_w = 100
    lx = (CANVAS_W - line_w) // 2
    sep_layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(sep_layer).rounded_rectangle(
        [lx, cur_y, lx + line_w, cur_y + 5], radius=3, fill=(*accent, 200))
    canvas = Image.alpha_composite(canvas, sep_layer)
    draw = ImageDraw.Draw(canvas)
    cur_y += 5 + 32

    # Sub copy
    for line in screen["sub"].split("\n"):
        sw2, sh2 = text_size(draw, line, font_sub)
        draw.text(((CANVAS_W - sw2) // 2, cur_y), line, font=font_sub, fill=TEXT_MUTED)
        cur_y += sh2 + 16

    header_bottom = cur_y + 72

    # ── Phone mockup ───────────────────────────────────────────────────────
    avail_h = CANVAS_H - header_bottom - 56
    avail_w = CANVAS_W - 100

    scale  = min(avail_w / sw, avail_h / sh)
    scr_w  = int(sw * scale)
    scr_h  = int(sh * scale)
    resized = screenshot.resize((scr_w, scr_h), Image.LANCZOS)

    paste_x = (CANVAS_W - scr_w) // 2
    paste_y = header_bottom

    canvas = draw_phone(canvas, resized, paste_x, paste_y, scr_w, scr_h)

    # ── Subtle overall overlay (store-banner style: very faint white veil) ─
    veil = Image.new("RGBA", (CANVAS_W, CANVAS_H), (255, 255, 255, 0))
    for y in range(CANVAS_H):
        a = int(18 * (1 - y / CANVAS_H))
        ImageDraw.Draw(veil).line([(0, y), (CANVAS_W, y)], fill=(255, 255, 255, a))
    canvas = Image.alpha_composite(canvas, veil)

    # ── Save ───────────────────────────────────────────────────────────────
    canvas.convert("RGB").save(out_path, "PNG", optimize=True)
    print(f"  ✓ {screen['out']}  ({CANVAS_W}×{CANVAS_H})")


if __name__ == "__main__":
    base = os.path.dirname(os.path.abspath(__file__))
    print(f"Generating {len(SCREENS)} App Store previews ({CANVAS_W}×{CANVAS_H}px)…")
    for s in SCREENS:
        generate(s, base)
    print("Done.")
