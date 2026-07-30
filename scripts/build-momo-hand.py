"""Build the original lowercase prototype of the Momo Hand display font.

The shapes in this file are drawn from simple geometric strokes and are not
traced from, or derived from, any external typeface.
"""

from math import atan2, cos, pi, sin
from pathlib import Path

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen


UPM = 1000
STROKE = 32
BASELINE = 125
X_HEIGHT = 625
ASCENDER = 810
DESCENDER = -105
OUT = Path(__file__).resolve().parents[1] / "assets" / "fonts" / "MomoHand-Regular.ttf"


def circle(pen, x, y, radius, reverse=False):
    """Draw a 16-sided circular contour. Direction controls an inner counter."""
    steps = 16
    # TrueType outer contours are clockwise; use the opposite direction only
    # when a glyph needs a deliberate counter shape.
    direction = 1 if reverse else -1
    points = [
        (x + radius * cos(direction * 2 * pi * i / steps), y + radius * sin(direction * 2 * pi * i / steps))
        for i in range(steps)
    ]
    pen.moveTo(points[0])
    for point in points[1:]:
        pen.lineTo(point)
    pen.closePath()


def capsule(pen, start, end, width=STROKE):
    """A round-ended, monoline segment made from a rectangle and two discs."""
    x1, y1 = start
    x2, y2 = end
    length = max(1, ((x2 - x1) ** 2 + (y2 - y1) ** 2) ** 0.5)
    nx = -(y2 - y1) / length * width / 2
    ny = (x2 - x1) / length * width / 2
    pen.moveTo((x1 + nx, y1 + ny))
    pen.lineTo((x2 + nx, y2 + ny))
    pen.lineTo((x2 - nx, y2 - ny))
    pen.lineTo((x1 - nx, y1 - ny))
    pen.closePath()
    circle(pen, x1, y1, width / 2)
    circle(pen, x2, y2, width / 2)


def polyline(pen, points, width=STROKE):
    for start, end in zip(points, points[1:]):
        capsule(pen, start, end, width)


def arc(pen, x, y, radius, start_degrees, end_degrees, width=STROKE, steps=14):
    start = start_degrees * pi / 180
    end = end_degrees * pi / 180
    points = [
        (x + radius * cos(start + (end - start) * i / steps), y + radius * sin(start + (end - start) * i / steps))
        for i in range(steps + 1)
    ]
    polyline(pen, points, width)


def loop(pen, x, y, radius_x, radius_y, width=STROKE):
    """A small irregular oval made from short, overlapping round strokes."""
    points = [
        (x + radius_x * cos(2 * pi * i / 20), y + radius_y * sin(2 * pi * i / 20))
        for i in range(21)
    ]
    polyline(pen, points, width)


def draw_glyph(letter):
    pen = TTGlyphPen(None)
    b, x, a, d = BASELINE, X_HEIGHT, ASCENDER, DESCENDER

    if letter == "a":
        loop(pen, 220, 375, 152, 205)
        capsule(pen, (372, 165), (372, 625))
    elif letter == "b":
        capsule(pen, (115, b), (115, a))
        loop(pen, 258, 375, 148, 205)
    elif letter == "c":
        arc(pen, 255, 380, 195, 43, 318)
    elif letter == "d":
        loop(pen, 212, 375, 148, 205)
        capsule(pen, (360, b), (360, a))
    elif letter == "e":
        arc(pen, 235, 380, 185, 30, 334)
        capsule(pen, (85, 380), (330, 380))
    elif letter == "f":
        capsule(pen, (245, b), (245, a))
        capsule(pen, (115, 585), (370, 585))
        capsule(pen, (170, 785), (310, 785))
    elif letter == "g":
        loop(pen, 220, 380, 150, 205)
        arc(pen, 280, 10, 168, 18, 160)
    elif letter == "h":
        capsule(pen, (110, b), (110, a))
        arc(pen, 245, 390, 155, 180, 0)
        capsule(pen, (400, 390), (400, b))
    elif letter == "i":
        capsule(pen, (205, b), (205, x))
        circle(pen, 205, 755, 34)
    elif letter == "j":
        capsule(pen, (270, 80), (270, x))
        arc(pen, 180, 90, 92, 338, 185)
        circle(pen, 270, 755, 34)
    elif letter == "k":
        capsule(pen, (110, b), (110, a))
        capsule(pen, (110, 370), (390, x))
        capsule(pen, (175, 400), (410, b))
    elif letter == "l":
        capsule(pen, (205, b), (205, a))
    elif letter == "m":
        capsule(pen, (95, b), (95, x))
        arc(pen, 210, 390, 115, 180, 0)
        capsule(pen, (325, 390), (325, b))
        arc(pen, 440, 390, 115, 180, 0)
        capsule(pen, (555, 390), (555, b))
    elif letter == "n":
        capsule(pen, (100, b), (100, x))
        arc(pen, 250, 390, 150, 180, 0)
        capsule(pen, (400, 390), (400, b))
    elif letter == "o":
        loop(pen, 235, 380, 168, 215)
    elif letter == "p":
        capsule(pen, (105, d), (105, x))
        loop(pen, 248, 375, 148, 205)
    elif letter == "q":
        loop(pen, 210, 375, 148, 205)
        capsule(pen, (358, d), (358, x))
    elif letter == "r":
        capsule(pen, (110, b), (110, x))
        arc(pen, 235, 465, 140, 180, 32)
    elif letter == "s":
        arc(pen, 232, 500, 145, 18, 208)
        arc(pen, 235, 255, 145, 198, 378)
    elif letter == "t":
        capsule(pen, (235, b), (235, a))
        capsule(pen, (90, 585), (385, 585))
    elif letter == "u":
        capsule(pen, (105, x), (105, 310))
        arc(pen, 255, 310, 150, 180, 360)
        capsule(pen, (405, 310), (405, x))
    elif letter == "v":
        polyline(pen, [(85, x), (240, b), (405, x)])
    elif letter == "w":
        polyline(pen, [(75, x), (180, b), (285, 460), (390, b), (505, x)])
    elif letter == "x":
        capsule(pen, (95, x), (390, b))
        capsule(pen, (390, x), (95, b))
    elif letter == "y":
        polyline(pen, [(85, x), (235, 330), (385, x)])
        capsule(pen, (235, 330), (175, d))
    elif letter == "z":
        polyline(pen, [(85, x), (390, x), (90, b), (395, b)])
    return pen.glyph()


def build_font():
    glyph_names = [".notdef", "space"] + list("abcdefghijklmnopqrstuvwxyz")
    fb = FontBuilder(UPM, isTTF=True)
    fb.setupGlyphOrder(glyph_names)
    cmap = {32: "space"}
    cmap.update({ord(letter): letter for letter in "abcdefghijklmnopqrstuvwxyz"})
    fb.setupCharacterMap(cmap)

    glyphs = {".notdef": TTGlyphPen(None).glyph(), "space": TTGlyphPen(None).glyph()}
    glyphs.update({letter: draw_glyph(letter) for letter in "abcdefghijklmnopqrstuvwxyz"})
    fb.setupGlyf(glyphs)
    metrics = {".notdef": (500, 0), "space": (260, 0)}
    metrics.update({letter: (600 if letter in "mw" else 480, 0) for letter in "abcdefghijklmnopqrstuvwxyz"})
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=860, descent=-150)
    fb.setupNameTable({
        "familyName": "Momo Hand",
        "styleName": "Regular",
        "uniqueFontIdentifier": "Moments Journal: Momo Hand Regular: 0.1",
        "fullName": "Momo Hand Regular",
        "psName": "MomoHand-Regular",
        "version": "Version 0.100",
    })
    fb.setupOS2(sTypoAscender=860, sTypoDescender=-150, usWinAscent=860, usWinDescent=150)
    fb.setupPost()
    fb.setupMaxp()
    fb.setupHead(created=0, modified=0)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    fb.save(OUT)
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    build_font()
