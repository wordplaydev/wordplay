import { CharacterSchema } from '@db/characters/Character';
import { describe, expect, test } from 'vitest';

/**
 * These guard the invariant that used to be enforced (badly) by a recursive
 * undefined-stripping pass on the character editor's save path: a character
 * handed to Firestore must never carry a literal `undefined` field value,
 * because Firestore's setDoc throws on one. The shape schemas declare their
 * optional fields with Zod's `exactOptional()`, so an absent key parses and a
 * present-but-undefined key does not.
 */
describe('CharacterSchema optionality is exact', () => {
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

    const rect = {
        type: 'rect',
        point: { x: 0, y: 0 },
        width: 4,
        height: 4,
    };

    test('a shape with absent optional keys parses', () => {
        expect(() => CharacterSchema.parse(character(rect))).not.toThrow();
    });

    test('a parsed shape omits absent optional keys rather than setting them undefined', () => {
        const parsed = CharacterSchema.parse(character(rect));
        const shape = parsed.shapes[0];
        // `in`, not `=== undefined`: Firestore rejects the key being present
        // with an undefined value, which a truthiness check wouldn't catch.
        expect('angle' in shape).toBe(false);
        expect('corner' in shape).toBe(false);
        expect('fill' in shape).toBe(false);
        expect('stroke' in shape).toBe(false);
    });

    test.each(['angle', 'corner', 'fill', 'stroke'])(
        'a shape with an explicit undefined %s is rejected',
        (field) => {
            expect(() =>
                CharacterSchema.parse(
                    character({ ...rect, [field]: undefined }),
                ),
            ).toThrow();
        },
    );

    const curvedPath = {
        type: 'path',
        closed: false,
        points: [
            { x: 0, y: 0 },
            { x: 8, y: 0, curve: { x: 4, y: 4 } },
        ],
    };

    test('a path point without a curve parses and omits the key', () => {
        const parsed = CharacterSchema.parse(
            character({ ...curvedPath, points: [{ x: 0, y: 0 }] }),
        );
        const shape = parsed.shapes[0];
        expect(shape.type).toBe('path');
        if (shape.type === 'path')
            expect('curve' in shape.points[0]).toBe(false);
    });

    test('a curved path point round-trips', () => {
        const parsed = CharacterSchema.parse(character(curvedPath));
        const shape = parsed.shapes[0];
        expect(shape.type).toBe('path');
        if (shape.type === 'path')
            expect(shape.points[1].curve).toEqual({ x: 4, y: 4 });
    });

    test('a path point with an explicit undefined curve is rejected', () => {
        expect(() =>
            CharacterSchema.parse(
                character({
                    ...curvedPath,
                    points: [{ x: 0, y: 0, curve: undefined }],
                }),
            ),
        ).toThrow();
    });

    test('a null fill survives — it means inherit currentColor, not absent', () => {
        const parsed = CharacterSchema.parse(
            character({ ...rect, fill: null }),
        );
        const shape = parsed.shapes[0];
        expect(shape.type).toBe('rect');
        if (shape.type === 'rect') expect(shape.fill).toBeNull();
    });
});

/**
 * Gallery membership (#822) is optional for the same reason `aliases` is:
 * characters carry no schema version, so a stored character has to keep
 * parsing without one. That makes it exactly the shape this file guards.
 */
describe('gallery membership is exactly optional', () => {
    function character(extra: Record<string, unknown>) {
        return {
            id: '3f7a1c9e-2b4d-4e8a-9c1f-6d5b0a2e7c31',
            owner: 'u1',
            public: false,
            collaborators: [],
            updated: 0,
            name: 'someone/Thing',
            description: '',
            shapes: [],
            ...extra,
        };
    }

    test('a character stored before #822 parses and omits the key', () => {
        const parsed = CharacterSchema.parse(character({}));
        expect('gallery' in parsed).toBe(false);
    });

    test('a character in a gallery parses', () => {
        expect(
            CharacterSchema.parse(character({ gallery: 'g1' })).gallery,
        ).toBe('g1');
    });

    test('a character taken out of a gallery parses as null', () => {
        // Removal writes null rather than deleting the key, so the field is
        // nullable as well as optional.
        expect(
            CharacterSchema.parse(character({ gallery: null })).gallery,
        ).toBe(null);
    });

    test('an explicit undefined gallery is rejected', () => {
        expect(() =>
            CharacterSchema.parse(character({ gallery: undefined })),
        ).toThrow();
    });
});
