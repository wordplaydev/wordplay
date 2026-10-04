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
import sys

from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont, newTable
from fontTools.ttLib.tables import sbixGlyph, sbixStrike


def main(source, out):
    font = TTFont(source)
    strikes = font["CBLC"].strikes
    data = font["CBDT"].strikeData
    order = font.getGlyphOrder()

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
            s.glyphs[name] = sbixGlyph.Glyph(
                glyphName=name,
                graphicType="png ",
                originOffsetX=m.BearingX if hasattr(m, "BearingX") else m.horiBearingX,
                originOffsetY=(m.BearingY if hasattr(m, "BearingY") else m.horiBearingY) - m.height,
                imageData=bitmap.imageData,
            )
        t.strikes[ppem] = s
    font["sbix"] = t
    del font["CBDT"]
    del font["CBLC"]

    empty = TTGlyphPen(None).glyph()
    glyf = newTable("glyf")
    glyf.glyphs = {name: empty for name in order}
    glyf.glyphOrder = order
    font["glyf"] = glyf
    font["loca"] = newTable("loca")
    font["head"].indexToLocFormat = 0
    font["maxp"].tableVersion = 0x00010000
    for attr in ("maxPoints", "maxContours", "maxCompositePoints", "maxCompositeContours",
                 "maxZones", "maxTwilightPoints", "maxStorage", "maxFunctionDefs",
                 "maxInstructionDefs", "maxStackElements", "maxSizeOfInstructions",
                 "maxComponentElements", "maxComponentDepth"):
        setattr(font["maxp"], attr, 1 if attr == "maxZones" else 0)
    font["post"].formatType = 3.0
    font.save(out)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
