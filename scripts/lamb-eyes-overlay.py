"""
Overlay exactly 7 sketchy hand-drawn eyes onto an eyeless cobalt lamb silhouette.

Strategy: detect the head by walking down rows of the silhouette from the top
and finding the first significant width drop (the neck). Then place 7 loose
hand-drawn almond eyes inside the head region.

The eye marks use intentional vertex jitter to read as hand-drawn rather than
geometric ellipses, matching the hybrid block+sketch style.

Usage:
    python3 scripts/lamb-eyes-overlay.py <input_path> <output_path> [--accent black|cream]
"""

from __future__ import annotations

import argparse
import math
import random

from PIL import Image, ImageDraw
import numpy as np

CREAM = (240, 236, 230)
COBALT = (31, 42, 141)
BLACK = (15, 15, 15)
COBALT_TOLERANCE = 60


def detect_head_bbox(img: Image.Image) -> tuple[int, int, int, int]:
    arr = np.array(img.convert("RGB"))
    diff = np.abs(arr.astype(int) - np.array(COBALT)).sum(axis=2)
    cobalt_mask = diff < COBALT_TOLERANCE

    row_widths = cobalt_mask.sum(axis=1)
    rows_with_cobalt = np.where(row_widths > 0)[0]
    if len(rows_with_cobalt) == 0:
        raise ValueError("No cobalt pixels found")

    top = int(rows_with_cobalt[0])

    # Walk down from the top, tracking max width seen. The head is the topmost
    # bulge — we exit when row width drops to ~50% of the local max we have
    # tracked, indicating the neck.
    head_max_row = top
    head_max_width = int(row_widths[top])
    head_bottom = top

    for y in range(top + 1, len(row_widths)):
        w = int(row_widths[y])
        if w > head_max_width:
            head_max_width = w
            head_max_row = y
        else:
            # Have we passed the head bulge and are now at the neck?
            if w < head_max_width * 0.55 and y > head_max_row + 8:
                head_bottom = y
                break
    else:
        head_bottom = head_max_row + 60

    # Determine head's horizontal bbox using only rows in [top, head_bottom]
    head_rows = cobalt_mask[top:head_bottom]
    cols = np.where(head_rows.any(axis=0))[0]
    if len(cols) == 0:
        raise ValueError("No head pixels found")
    return int(cols[0]), top, int(cols[-1]), head_bottom


def jittered_almond_points(
    cx: int,
    cy: int,
    w: int,
    h: int,
    rng: random.Random,
    n_points: int = 18,
    jitter: float = 0.18,
) -> list[tuple[int, int]]:
    pts = []
    for i in range(n_points):
        angle = 2 * math.pi * i / n_points
        rx = (w / 2) * (1 + rng.uniform(-jitter, jitter))
        ry = (h / 2) * (1 + rng.uniform(-jitter, jitter))
        x = cx + rx * math.cos(angle)
        y = cy + ry * math.sin(angle)
        pts.append((int(x), int(y)))
    return pts


def draw_sketchy_eye(
    draw: ImageDraw.ImageDraw,
    cx: int,
    cy: int,
    w: int,
    h: int,
    accent: tuple[int, int, int],
    rng: random.Random,
) -> None:
    # Cream-filled almond outline drawn with multiple jittered passes for hand feel
    for _ in range(2):
        pts = jittered_almond_points(cx, cy, w, h, rng, jitter=0.12)
        draw.polygon(pts, fill=CREAM)

    # Sketchy outline — multiple jittered passes in accent color
    for _ in range(3):
        pts = jittered_almond_points(cx, cy, w, h, rng, jitter=0.20)
        for i in range(len(pts)):
            x1, y1 = pts[i]
            x2, y2 = pts[(i + 1) % len(pts)]
            draw.line((x1, y1, x2, y2), fill=accent, width=3)

    # Pupil — small jittered dot
    pupil_size = max(5, w // 6)
    pupil_pts = jittered_almond_points(
        cx + rng.randint(-2, 2),
        cy + rng.randint(-1, 1),
        pupil_size,
        pupil_size,
        rng,
        jitter=0.18,
    )
    draw.polygon(pupil_pts, fill=accent)


def overlay_seven_eyes(
    input_path: str,
    output_path: str,
    accent_color: str = "black",
    seed: int = 7,
) -> None:
    img = Image.open(input_path).convert("RGB")
    head_left, head_top, head_right, head_bot = detect_head_bbox(img)
    head_w = head_right - head_left
    head_h = head_bot - head_top

    rng = random.Random(seed)

    accent = BLACK if accent_color == "black" else COBALT

    # Center the eye cluster horizontally on the head and vertically a bit
    # below the top of the head so the cluster reads as forehead/face area
    cx = head_left + head_w // 2
    cy = head_top + int(head_h * 0.55)

    eye_w = max(20, int(head_w * 0.16))
    eye_h = int(eye_w * 0.62)

    spacing_x = int(head_w * 0.20)
    spacing_y = int(head_h * 0.22)

    eye_positions = [
        # Top row: 3 eyes
        (cx - spacing_x, cy - spacing_y),
        (cx, cy - spacing_y),
        (cx + spacing_x, cy - spacing_y),
        # Middle row: 2 eyes flanking center, slightly inset
        (cx - int(spacing_x * 0.55), cy),
        (cx + int(spacing_x * 0.55), cy),
        # Bottom row: 2 eyes flanking center
        (cx - int(spacing_x * 0.45), cy + spacing_y),
        (cx + int(spacing_x * 0.45), cy + spacing_y),
    ]

    assert len(eye_positions) == 7, f"Expected 7 eyes, got {len(eye_positions)}"

    draw = ImageDraw.Draw(img)
    for ex, ey in eye_positions:
        draw_sketchy_eye(draw, ex, ey, eye_w, eye_h, accent, rng)

    img.save(output_path, "PNG")
    print(f"Drew {len(eye_positions)} sketchy eyes -> {output_path}")
    print(f"Head bbox: ({head_left}, {head_top}, {head_right}, {head_bot})")
    print(f"Head size: {head_w}x{head_h}")
    print(f"Eye cluster center: ({cx}, {cy})")
    print(f"Eye size: {eye_w}x{eye_h}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("input")
    parser.add_argument("output")
    parser.add_argument("--accent", choices=["black", "cobalt"], default="black")
    parser.add_argument("--seed", type=int, default=7)
    args = parser.parse_args()
    overlay_seven_eyes(args.input, args.output, args.accent, args.seed)
