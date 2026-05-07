"""
Full hybrid-style overlay: block lamb silhouette + loose sketched wool curls,
contour gestures, and exactly 7 sketchy eyes — all in black/contrast color
on top of the cobalt block.

Demonstrates the brand's block-form + sketchy-overlay aesthetic in one image.

Usage:
    python3 scripts/lamb-hybrid-overlay.py <input_path> <output_path> [--seed N]
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


def detect_head_bbox(arr_mask: np.ndarray) -> tuple[int, int, int, int]:
    row_widths = arr_mask.sum(axis=1)
    rows_with_cobalt = np.where(row_widths > 0)[0]
    top = int(rows_with_cobalt[0])

    head_max_row = top
    head_max_width = int(row_widths[top])
    head_bottom = top

    for y in range(top + 1, len(row_widths)):
        w = int(row_widths[y])
        if w > head_max_width:
            head_max_width = w
            head_max_row = y
        else:
            if w < head_max_width * 0.55 and y > head_max_row + 8:
                head_bottom = y
                break
    else:
        head_bottom = head_max_row + 60

    head_rows = arr_mask[top:head_bottom]
    cols = np.where(head_rows.any(axis=0))[0]
    return int(cols[0]), top, int(cols[-1]), head_bottom


def detect_body_bbox(arr_mask: np.ndarray) -> tuple[int, int, int, int]:
    rows = np.where(arr_mask.any(axis=1))[0]
    cols = np.where(arr_mask.any(axis=0))[0]
    return int(cols[0]), int(rows[0]), int(cols[-1]), int(rows[-1])


def jittered_curve(
    x0: float,
    y0: float,
    x1: float,
    y1: float,
    rng: random.Random,
    n_segments: int = 20,
    jitter_amount: float = 4.0,
) -> list[tuple[int, int]]:
    pts = []
    for i in range(n_segments + 1):
        t = i / n_segments
        x = x0 + (x1 - x0) * t
        y = y0 + (y1 - y0) * t
        x += rng.uniform(-jitter_amount, jitter_amount)
        y += rng.uniform(-jitter_amount, jitter_amount)
        pts.append((int(x), int(y)))
    return pts


def jittered_circle(
    cx: float,
    cy: float,
    r: float,
    rng: random.Random,
    n_points: int = 16,
    jitter: float = 0.18,
) -> list[tuple[int, int]]:
    pts = []
    for i in range(n_points):
        angle = 2 * math.pi * i / n_points
        rr = r * (1 + rng.uniform(-jitter, jitter))
        x = cx + rr * math.cos(angle)
        y = cy + rr * math.sin(angle)
        pts.append((int(x), int(y)))
    return pts


def draw_sketchy_almond(
    draw: ImageDraw.ImageDraw,
    cx: int,
    cy: int,
    w: int,
    h: int,
    accent: tuple[int, int, int],
    rng: random.Random,
) -> None:
    # Cream fill
    pts = []
    for i in range(18):
        a = 2 * math.pi * i / 18
        rx = (w / 2) * (1 + rng.uniform(-0.12, 0.12))
        ry = (h / 2) * (1 + rng.uniform(-0.12, 0.12))
        pts.append((int(cx + rx * math.cos(a)), int(cy + ry * math.sin(a))))
    draw.polygon(pts, fill=CREAM)

    # Sketchy outline — multiple loose passes
    for _ in range(3):
        pts = []
        for i in range(20):
            a = 2 * math.pi * i / 20
            rx = (w / 2) * (1 + rng.uniform(-0.18, 0.18))
            ry = (h / 2) * (1 + rng.uniform(-0.18, 0.18))
            pts.append((int(cx + rx * math.cos(a)), int(cy + ry * math.sin(a))))
        for i in range(len(pts)):
            x1, y1 = pts[i]
            x2, y2 = pts[(i + 1) % len(pts)]
            draw.line((x1, y1, x2, y2), fill=accent, width=3)

    # Pupil
    pupil = max(5, w // 6)
    pup_pts = jittered_circle(
        cx + rng.randint(-2, 2),
        cy + rng.randint(-1, 1),
        pupil,
        rng,
        n_points=12,
        jitter=0.16,
    )
    draw.polygon(pup_pts, fill=accent)


def draw_wool_curl(
    draw: ImageDraw.ImageDraw,
    cx: int,
    cy: int,
    r: int,
    accent: tuple[int, int, int],
    rng: random.Random,
) -> None:
    # A spiral / curl mark — multiple short arcs simulating curly wool
    n = 14
    angle_offset = rng.uniform(0, 2 * math.pi)
    pts = []
    for i in range(n + 1):
        t = i / n
        # Spiral inward
        rr = r * (1 - 0.55 * t) * (1 + rng.uniform(-0.12, 0.12))
        a = angle_offset + 2 * math.pi * t * 1.4
        x = cx + rr * math.cos(a) + rng.uniform(-1.5, 1.5)
        y = cy + rr * math.sin(a) + rng.uniform(-1.5, 1.5)
        pts.append((int(x), int(y)))
    for i in range(len(pts) - 1):
        draw.line(
            (pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]),
            fill=accent,
            width=2,
        )


def overlay_hybrid(
    input_path: str,
    output_path: str,
    seed: int = 7,
) -> None:
    img = Image.open(input_path).convert("RGB")
    arr = np.array(img)
    diff = np.abs(arr.astype(int) - np.array(COBALT)).sum(axis=2)
    cobalt_mask = diff < COBALT_TOLERANCE

    head_left, head_top, head_right, head_bot = detect_head_bbox(cobalt_mask)
    body_left, body_top, body_right, body_bot = detect_body_bbox(cobalt_mask)
    head_w = head_right - head_left
    head_h = head_bot - head_top

    rng = random.Random(seed)
    draw = ImageDraw.Draw(img)
    accent = BLACK

    # 1. Wool curls scattered across the body
    body_inner_left = body_left + int((body_right - body_left) * 0.10)
    body_inner_right = body_right - int((body_right - body_left) * 0.10)
    body_inner_top = body_top + head_h + 10  # below head
    body_inner_bot = body_bot - int((body_bot - body_top) * 0.20)

    n_curls = 9
    for _ in range(n_curls):
        # Sample only on cobalt area
        for _attempt in range(20):
            x = rng.randint(body_inner_left, body_inner_right)
            y = rng.randint(body_inner_top, body_inner_bot)
            if cobalt_mask[y, x]:
                break
        else:
            continue
        r = rng.randint(14, 24)
        draw_wool_curl(draw, x, y, r, accent, rng)

    # 2. Loose contour gesture — a sketchy line tracing part of the back
    # (top contour of the body, just inside the silhouette edge)
    contour_y0 = body_top + head_h + 18
    contour_y1 = contour_y0
    contour_x0 = body_left + int((body_right - body_left) * 0.18)
    contour_x1 = body_left + int((body_right - body_left) * 0.62)
    contour_pts = jittered_curve(
        contour_x0, contour_y0, contour_x1, contour_y1, rng,
        n_segments=18, jitter_amount=3.0,
    )
    for i in range(len(contour_pts) - 1):
        draw.line(
            (contour_pts[i][0], contour_pts[i][1],
             contour_pts[i + 1][0], contour_pts[i + 1][1]),
            fill=accent, width=2,
        )

    # 3. Seven eyes — guaranteed count, sketchy almond style
    cx = head_left + head_w // 2
    cy = head_top + int(head_h * 0.55)
    eye_w = max(20, int(head_w * 0.16))
    eye_h = int(eye_w * 0.62)
    spacing_x = int(head_w * 0.20)
    spacing_y = int(head_h * 0.22)

    eye_positions = [
        (cx - spacing_x, cy - spacing_y),
        (cx, cy - spacing_y),
        (cx + spacing_x, cy - spacing_y),
        (cx - int(spacing_x * 0.55), cy),
        (cx + int(spacing_x * 0.55), cy),
        (cx - int(spacing_x * 0.45), cy + spacing_y),
        (cx + int(spacing_x * 0.45), cy + spacing_y),
    ]
    assert len(eye_positions) == 7

    for ex, ey in eye_positions:
        draw_sketchy_almond(draw, ex, ey, eye_w, eye_h, accent, rng)

    img.save(output_path, "PNG")
    print(f"Hybrid overlay -> {output_path}")
    print(f"Head bbox: ({head_left}, {head_top}, {head_right}, {head_bot})")
    print(f"Drew 7 sketchy eyes + {n_curls} wool curls + 1 contour line")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("input")
    parser.add_argument("output")
    parser.add_argument("--seed", type=int, default=7)
    args = parser.parse_args()
    overlay_hybrid(args.input, args.output, args.seed)
