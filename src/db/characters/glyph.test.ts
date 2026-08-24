import {
    CharacterSchema,
    characterToSVG,
    GlyphPathPattern,
    MaxGlyphPathLength,
    type CharacterGlyph,
} from '@db/characters/Character';
import {
    commandsToUnitPath,
    findCoveringFace,
    isTraceable,
} from '@db/characters/glyph';
import { flipShape, getShapeBounds } from '@db/characters/paths';
import type { PathCommand } from 'fontkit';
import { describe, expect, test } from 'vitest';

/** A character document wrapping one shape, for schema tests. */
function character(shape: unknown) {
    return {
        id: '3f7a1c9e-2b4d-4e8a-9c1f-6d5b0a2e7c31',
        owner: null,
        public: true,
        collaborators: [],
        updated: 0,
        name: 'someone/Thing',
        description: '',
        shapes: [shape],
    };
}

function glyph(overrides: Partial<CharacterGlyph> = {}): CharacterGlyph {
    return {
        type: 'glyph',
        character: 'A',
        face: 'Noto Sans',
        point: { x: 4, y: 6 },
        width: 10,
        height: 20,
        d: 'M 0 1 L 1 1 L 0.5 0 Z',
        ...overrides,
    };
}

describe('commandsToUnitPath', () => {
    /** A triangle in font units: 1000 wide, 500 tall, sitting on the baseline. */
    const triangle: PathCommand[] = [
        { command: 'moveTo', args: [0, 0] },
        { command: 'lineTo', args: [1000, 0] },
        { command: 'lineTo', args: [500, 500] },
        { command: 'closePath', args: [] },
    ];
    const box = { minX: 0, minY: 0, maxX: 1000, maxY: 500 };

    test('normalizes the ink into the unit box', () => {
        // Every coordinate lands in 0..1 regardless of the font's units.
        const d = commandsToUnitPath(triangle, box);
        for (const number of d.match(/-?\d*\.?\d+/g) ?? [])
            expect(Number(number)).toBeGreaterThanOrEqual(0);
        expect(d).toContain('M 0 1');
    });

    test('flips y, because font outlines are y-up and SVG is y-down', () => {
        // The apex sits at the top of the font's box (y 500) and so must come
        // out at the *top* of the SVG box, which is y 0.
        expect(commandsToUnitPath(triangle, box)).toContain('L 0.5 0');
    });

    test('emits only what the schema pattern allows', () => {
        // The generator and the guard must not disagree: `d` is interpolated
        // into an SVG attribute rendered with {@html} from other creators'
        // documents, and the schema is what makes that safe.
        const commands: PathCommand[] = [
            ...triangle,
            { command: 'quadraticCurveTo', args: [100, 200, 300, 400] },
            { command: 'bezierCurveTo', args: [1, 2, 3, 4, 5, 6] },
        ];
        expect(GlyphPathPattern.test(commandsToUnitPath(commands, box))).toBe(
            true,
        );
    });

    test('rounds without exponent notation, which the pattern would reject', () => {
        // A tiny coordinate formatted as 1e-7 would fail the schema and the
        // whole character would stop parsing.
        const tiny: PathCommand[] = [
            { command: 'moveTo', args: [0.0000001, 0] },
        ];
        const d = commandsToUnitPath(tiny, { ...box, maxX: 1e9 });
        expect(d).not.toMatch(/e/i);
        expect(GlyphPathPattern.test(d)).toBe(true);
    });

    test('an empty ink box produces nothing rather than dividing by zero', () => {
        expect(
            commandsToUnitPath(triangle, {
                minX: 5,
                minY: 5,
                maxX: 5,
                maxY: 5,
            }),
        ).toBe('');
    });
});

describe('isTraceable', () => {
    test.each([
        ['A', true],
        ['π', true],
        ['★', true],
        // One grapheme, two codepoints.
        ['é', true],
        ['😀', true],
        ['', false],
        ['ab', false],
    ])('%s -> %s', (text, expected) => {
        expect(isTraceable(text)).toBe(expected);
    });
});

describe('the glyph schema', () => {
    test('a glyph with absent optional keys parses and stays absent', () => {
        const parsed = CharacterSchema.parse(character(glyph()));
        const shape = parsed.shapes[0];
        // Firestore rejects a key present with an undefined value.
        expect('angle' in shape).toBe(false);
        expect('mirrored' in shape).toBe(false);
        expect('italic' in shape).toBe(false);
    });

    test.each(['"', '<', '&', 'javascript:', 'M 0 0" onload="x'])(
        'rejects an outline containing %s',
        (bad) => {
            // The outline is the first free-form string Character.ts writes into
            // an SVG attribute, and it renders with {@html} from other people's
            // public documents.
            expect(() =>
                CharacterSchema.parse(character(glyph({ d: `M 0 0 ${bad}` }))),
            ).toThrow();
        },
    );

    test('rejects an outline past the length cap', () => {
        expect(() =>
            CharacterSchema.parse(
                character(glyph({ d: 'M '.repeat(MaxGlyphPathLength) })),
            ),
        ).toThrow();
    });
});

describe('rendering and geometry', () => {
    test('renders one element, so hit testing can map it back to the shape', () => {
        // getShapeUnderPointer maps an SVG child index to a shapes index, so a
        // glyph that rendered a group would shift every shape after it.
        const svg = characterToSVG(
            CharacterSchema.parse(character(glyph())),
            '32px',
        );
        expect(svg.match(/<path/g)).toHaveLength(1);
        expect(svg).not.toContain('<g');
    });

    test('places, turns, and sizes with one transform', () => {
        const svg = characterToSVG(
            CharacterSchema.parse(character(glyph({ angle: 30 }))),
            '32px',
        );
        expect(svg).toContain(
            'transform="translate(4 6) rotate(30 5 10) scale(10 20)"',
        );
    });

    test('a mirrored glyph reflects in place rather than moving', () => {
        const svg = characterToSVG(
            CharacterSchema.parse(character(glyph({ mirrored: true }))),
            '32px',
        );
        // Negative width reflects; the extra translate keeps the box where it was.
        expect(svg).toContain('translate(14 6)');
        expect(svg).toContain('scale(-10 20)');
    });

    test('its bounds are its box', () => {
        expect(getShapeBounds(glyph())).toEqual({
            left: 4,
            top: 6,
            right: 14,
            bottom: 26,
        });
    });

    test('flipping mirrors the outline, not just the box', () => {
        // Moving the box is a no-op for a symmetric rectangle and wrong for a
        // glyph, which is why the mirror is stored.
        const shape = glyph();
        const box = { left: 0, top: 0, right: 32, bottom: 32 };
        flipShape(shape, box, 'horizontal');
        expect(shape.mirrored).toBe(true);
        flipShape(shape, box, 'horizontal');
        expect('mirrored' in shape).toBe(false);
    });

    test('flipping twice returns the glyph to where it started', () => {
        const shape = glyph({ angle: 20 });
        const box = { left: 0, top: 0, right: 32, bottom: 32 };
        const before = JSON.parse(JSON.stringify(shape));
        flipShape(shape, box, 'horizontal');
        flipShape(shape, box, 'horizontal');
        expect(shape).toEqual(before);
    });

    test('a vertical flip is a mirror plus a half turn', () => {
        const shape = glyph({ angle: 0 });
        flipShape(
            shape,
            { left: 0, top: 0, right: 32, bottom: 32 },
            'vertical',
        );
        expect(shape.mirrored).toBe(true);
        expect(shape.angle).toBe(180);
    });
});

describe('findCoveringFace', () => {
    test('keeps the chosen face when it covers the character', () => {
        expect(findCoveringFace('A'.codePointAt(0) ?? 0, 'Noto Sans')).toBe(
            'Noto Sans',
        );
    });

    test.each([
        ['★', 0x2605],
        ['あ', 0x3042],
    ])(
        'finds another face for %s, which Noto Sans has no shape for',
        (_character, codepoint) => {
            // The chooser offers every character the app can render, but no one
            // face covers them all. Without this the creator picks a star, gets
            // "this font has no shape for that symbol", and has no way to learn
            // which font does.
            const face = findCoveringFace(codepoint, 'Noto Sans');
            expect(face).toBeDefined();
            expect(face).not.toBe('Noto Sans');
        },
    );

    test('reports nothing when no face claims the character', () => {
        // An unassigned codepoint in a supplementary plane. (Private-use ones
        // don't work as a probe: a CJK face declares that block.)
        expect(findCoveringFace(0xe01f0, 'Noto Sans')).toBeUndefined();
    });
});
