#!/usr/bin/env python3
"""Normalize transparent sticker PNGs for consistent in-app rendering."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageFilter


def clean_edge_fringe(image: Image.Image, radius: int) -> Image.Image:
    if radius <= 0:
        return image

    image = image.copy()
    pixels = image.load()
    alpha = image.getchannel("A")
    interior = alpha.filter(ImageFilter.MinFilter(radius * 2 + 1))
    interior_pixels = interior.load()

    for y in range(image.height):
        for x in range(image.width):
            red, green, blue, opacity = pixels[x, y]
            if opacity == 0 or interior_pixels[x, y] > 0:
                continue

            is_neutral_dark = (
                max(red, green, blue) - min(red, green, blue) < 34
                and max(red, green, blue) < 170
            )
            if is_neutral_dark:
                pixels[x, y] = (red, green, blue, 0)

    return image


def normalize_sticker(
    source: Path,
    padding: int,
    max_size: int,
    edge_fringe: int,
    alpha_threshold: int,
) -> tuple[int, int]:
    image = Image.open(source).convert("RGBA")
    alpha = image.getchannel("A").point(
        lambda value: 0 if value < alpha_threshold else value
    )
    image.putalpha(alpha)
    image = clean_edge_fringe(image, edge_fringe)

    bounds = image.getchannel("A").getbbox()
    if not bounds:
        raise ValueError(f"{source} contains no visible pixels")

    image = image.crop(bounds)
    if max(image.size) > max_size:
        image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (image.width + padding * 2, image.height + padding * 2))
    canvas.alpha_composite(image, (padding, padding))
    canvas.save(source, optimize=True)
    return canvas.size


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("files", nargs="+", type=Path)
    parser.add_argument("--padding", type=int, default=8)
    parser.add_argument("--max-size", type=int, default=720)
    parser.add_argument("--edge-fringe", type=int, default=0)
    parser.add_argument("--alpha-threshold", type=int, default=12)
    args = parser.parse_args()

    for source in args.files:
        size = normalize_sticker(
            source,
            args.padding,
            args.max_size,
            args.edge_fringe,
            args.alpha_threshold,
        )
        print(f"{source}: {size[0]}x{size[1]}")


if __name__ == "__main__":
    main()
