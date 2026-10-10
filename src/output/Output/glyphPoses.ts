import type { FontWeight } from '#basis/faces/Fonts.ts';
import ConceptLink, {
    CharacterName,
    CodepointName,
} from '#nodes/ConceptLink.ts';
import type Markup from '#nodes/Markup.ts';
import { Sym } from '#nodes/Sym.ts';
import Token from '#nodes/Token.ts';
import Words from '#nodes/Words.ts';
import type Pose from '#output/animation/Pose.ts';
import { PX_PER_METER } from '#output/Output/outputToCSS.ts';
import {
    splitCharacterRefs,
    type TextChunk,
} from '#output/Output/splitCharacterRefs.ts';
import { unescapeMarkupSymbols } from '#parser/Tokenizer.ts';
import UnicodeString from '#unicode/UnicodeString.ts';

// Everything a phrase needs to draw its text glyph by glyph (Phrase.poses). Only
// the dynamically imported PosedText reaches this, so phrases without poses pay nothing for it.

/** One glyph of a phrase posed per glyph: a grapheme or a custom character, and the pose it takes. */
export type PosedGlyph = { glyph: TextChunk; pose: Pose };

/** A run of markup text sharing one style, as drawn glyph by glyph in a posed phrase. */
export type GlyphRun = {
    text: string;
    italic: boolean;
    weight: FontWeight;
    underline: boolean;
};

/** Split plain text into glyphs (a custom character counts as one), so each can take a pose. */
export function toGlyphs(text: string): TextChunk[] {
    return splitCharacterRefs(text).flatMap((chunk): TextChunk[] =>
        chunk.kind === 'character'
            ? [chunk]
            : new UnicodeString(chunk.text)
                  .getGraphemes()
                  .map((grapheme) => ({ kind: 'text', text: grapheme })),
    );
}

/** Pair each glyph of the text with a pose, starting the cycle at the given glyph index and wrapping around the poses. */
export function poseGlyphs(
    text: string,
    poses: Pose[],
    start = 0,
): PosedGlyph[] {
    return toGlyphs(text).flatMap((glyph, index) => {
        const pose = poses[(start + index) % poses.length];
        return pose === undefined ? [] : [{ glyph, pose }];
    });
}

/**
 * Group glyphs into words and the whitespace between them, so a word whose glyphs are
 * transformed can be kept from breaking mid-word: each transformed glyph is an atomic
 * inline, and the browser may break a line between any two of those.
 */
export function groupWords(glyphs: PosedGlyph[]): PosedGlyph[][] {
    const groups: PosedGlyph[][] = [];
    let word: PosedGlyph[] = [];
    for (const glyph of glyphs) {
        if (glyph.glyph.kind === 'text' && /^\s+$/u.test(glyph.glyph.text)) {
            if (word.length > 0) groups.push(word);
            groups.push([glyph]);
            word = [];
        } else word.push(glyph);
    }
    if (word.length > 0) groups.push(word);
    return groups;
}

/**
 * The transform for one glyph, or undefined when its pose moves nothing. Applied around
 * the glyph's own center, inside the phrase's transform, so it uses the same axes and
 * units as `toOutputTransform` without any of its placement.
 */
export function toGlyphTransform(pose: Pose): string | undefined {
    const scale = pose.scale ?? 1;
    const xScale = scale * (pose.flipx ? -1 : 1);
    const yScale = scale * (pose.flipy ? -1 : 1);
    const x = (pose.offset?.x ?? 0) * PX_PER_METER;
    const y = (pose.offset?.y ?? 0) * PX_PER_METER;
    const rotation = pose.rotation ?? 0;
    if (xScale === 1 && yScale === 1 && x === 0 && y === 0 && rotation === 0)
        return undefined;
    // Negate y to account for the flipped y axis, as toOutputTransform does.
    return `translate(${x}px, ${-y}px) rotate(${rotation}deg) scale(${xScale}, ${yScale})`;
}

/**
 * Markup's text as styled runs. Unlike `Markup.getFormats`, which is for measuring,
 * this keeps underlines and the spaces between tokens, and unescapes markup symbols
 * as SegmentHTMLView does.
 */
export function toGlyphRuns(markup: Markup): GlyphRun[] {
    const runs: GlyphRun[] = [];
    // The formats enclosing the current node, innermost first.
    const words: Words[] = [];
    for (const node of markup.traverseTopDownWithEnterAndExit()) {
        if (node instanceof Words) {
            if (words[0] === node) words.shift();
            else words.unshift(node);
        } else if (node instanceof Token) {
            const space = markup.spaces?.getSpace(node) ?? '';
            if (
                runs.length > 0 &&
                /^[ \t\n]+$/.test(space) &&
                !space.includes('\n\n')
            )
                runs.push({
                    text: ' ',
                    italic: false,
                    weight: 400,
                    underline: false,
                });
            const text = node.isSymbol(Sym.Words)
                ? unescapeMarkupSymbols(node.getText()).replaceAll('--', '—')
                : node.isSymbol(Sym.URL)
                  ? node.getText()
                  : node.isSymbol(Sym.Concept)
                    ? conceptGlyphText(node.getText())
                    : undefined;
            if (text !== undefined)
                runs.push({
                    text,
                    italic: words.some((w) => w.getFormat() === 'italic'),
                    weight:
                        words
                            .map((w) => w.getWeight())
                            .find((w) => w !== undefined) ?? 400,
                    underline: words.some((w) => w.getFormat() === 'underline'),
                });
        }
    }
    return runs;
}

/** The text a concept link stands for in a posed phrase: a codepoint's character, a custom character's reference, or nothing. */
function conceptGlyphText(text: string): string | undefined {
    const match = ConceptLink.parse(text.slice(1));
    return match instanceof CodepointName
        ? match.codepoint
        : match instanceof CharacterName
          ? text
          : undefined;
}
