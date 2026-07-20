import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, test } from 'vitest';
import Fonts, { Faces, getFontFileURL } from './Fonts';

describe('FontManager outside a browser', () => {
    test('constructs and reports a stable load generation without a document', () => {
        expect(Fonts.getLoadGeneration()).toBe(0);
    });

    test('marks CSS-declared faces as loaded so loadFace skips them', () => {
        for (const name of [
            'Noto Sans Japanese',
            'Noto Sans Korean',
            'Noto Sans Simplified Chinese',
        ])
            expect(Fonts.isFaceRequested(name)).toBe(true);
    });
});

describe('CJK creator faces', () => {
    test('are range-subset woff2 faces whose files exist', () => {
        for (const name of [
            'Noto Sans Japanese',
            'Noto Sans Korean',
            'Noto Sans Simplified Chinese',
        ]) {
            const face = Faces[name];
            expect(face.format).toBe('woff2');
            expect(
                typeof face.ranges === 'string' ? [] : (face.ranges ?? []),
            ).not.toHaveLength(0);
            if (face.ranges === undefined || typeof face.ranges === 'string')
                continue;
            // Every range file the URL scheme derives must exist on disk.
            for (const range of face.ranges) {
                const url = getFontFileURL({
                    name,
                    weight: 400,
                    italic: false,
                    format: face.format,
                    range,
                });
                expect(url).toBeDefined();
                if (url === undefined) continue;
                const file = path.join(
                    'static',
                    ...url.split('/').filter(Boolean),
                );
                expect(
                    fs.existsSync(file) && fs.statSync(file).size > 0,
                    `${file} should exist and be non-empty`,
                ).toBe(true);
            }
        }
    });
});
