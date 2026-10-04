#!/usr/bin/env python3
"""Convert Google's bitmap Noto Color Emoji (CBDT, Android's format) into sbix,
Apple's bitmap color format, for iOS.

iOS 27 Safari loads an OT-SVG font but paints none of its glyphs (iOS 26 paints
them), while every iOS version paints sbix, so iOS gets Noto's own PNGs in the
table Apple Color Emoji itself uses. The PNG bytes are copied unchanged; only
the container differs. sbix needs outlines to exist, so every glyph gets an
empty one.

Usage: cbdt-to-sbix.py <NotoColorEmoji.ttf (CBDT)> <output .ttf>
"""
import io
import sys

from fontTools.pens.ttGlyphPen import TTGlyphPen
from PIL import Image
from fontTools.ttLib import TTFont, newTable
from fontTools.ttLib.tables import sbixGlyph, sbixStrike


def main(source, out):
    font = TTFont(source)
    strikes = font["CBLC"].strikes
    data = font["CBDT"].strikeData
    order = font.getGlyphOrder()
    upm = font["head"].unitsPerEm
    outlines = {}

    t = newTable("sbix")
    t.version = 1
    # Bit 0 must be set; bit 1 asks for outlines to be drawn too, which we don't.
    t.flags = 1
    t.strikes = {}
    for strike, glyphs in zip(strikes, data):
        ppem = strike.bitmapSizeTable.ppemY
        s = sbixStrike.Strike(ppem=ppem, resolution=72)
        for name in order:
            bitmap = glyphs.get(name)
            if bitmap is None:
                s.glyphs[name] = sbixGlyph.Glyph(glyphName=name)
                continue
            bitmap.decompile()
            m = bitmap.metrics
            # CBDT measures the bitmap's top from the baseline; sbix places its
            # bottom-left corner, in pixels at this strike's ppem.
            left = m.BearingX if hasattr(m, "BearingX") else m.horiBearingX
            top = m.BearingY if hasattr(m, "BearingY") else m.horiBearingY
            s.glyphs[name] = sbixGlyph.Glyph(
                glyphName=name,
                graphicType="png ",
                originOffsetX=left,
                originOffsetY=top - m.height,
                imageData=bitmap.imageData,
            )
            if name not in outlines:
                outlines[name] = ink_outline(bitmap.imageData, left, top, upm / ppem)
        t.strikes[ppem] = s
    font["sbix"] = t
    del font["CBDT"]
    del font["CBLC"]

    empty = TTGlyphPen(None).glyph()
    glyf = newTable("glyf")
    glyf.glyphs = {name: outlines.get(name, empty) for name in order}
    glyf.glyphOrder = order
    font["glyf"] = glyf
    font["loca"] = newTable("loca")
    font["head"].indexToLocFormat = 0
    font["maxp"].tableVersion = 0x00010000
    font["maxp"].numGlyphs = len(order)
    # The CBDT font has a version 0.5 maxp; glyf needs 1.0's fields. The point
    # and contour maxima are recalculated from the outlines on save.
    for attr in ("maxPoints", "maxContours", "maxCompositePoints", "maxCompositeContours",
                 "maxZones", "maxTwilightPoints", "maxStorage", "maxFunctionDefs",
                 "maxInstructionDefs", "maxStackElements", "maxSizeOfInstructions",
                 "maxComponentElements", "maxComponentDepth"):
        setattr(font["maxp"], attr, 1 if attr == "maxZones" else 0)
    font["post"].formatType = 3.0
    font.recalcBBoxes = True
    font.save(out)


def ink_outline(png, left, top, scale):
    """A rectangle around the picture's non-transparent pixels, in font units."""
    image = Image.open(io.BytesIO(png)).convert("RGBA")
    box = image.getchannel("A").getbbox()
    pen = TTGlyphPen(None)
    if box is not None:
        x0, y0, x1, y1 = box
        # Image rows count down from the bitmap's top, which sits `top` above the baseline.
        l, r = round((left + x0) * scale), round((left + x1) * scale)
        t, b = round((top - y0) * scale), round((top - y1) * scale)
        pen.moveTo((l, b))
        pen.lineTo((l, t))
        pen.lineTo((r, t))
        pen.lineTo((r, b))
        pen.closePath()
    return pen.glyph()


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
