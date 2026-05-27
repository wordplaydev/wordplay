import { describe, expect, test } from 'vitest';
import { collectUsedPrefixes } from '@util/verify-locales/findUnusedKeys';

describe('collectUsedPrefixes', () => {
    test('captures a closure-form locale accessor', () => {
        const used = collectUsedPrefixes([
            "locales.get((l) => l.ui.source.empty)",
        ]);
        expect(used.has('ui.source.empty')).toBe(true);
    });

    test('captures accessors with the `locale` parameter name', () => {
        const used = collectUsedPrefixes([
            'concretize((locale) => locale.node.Bind.start, inputs)',
        ]);
        expect(used.has('node.Bind.start')).toBe(true);
    });

    test('captures accessors with the `texts` parameter name', () => {
        const used = collectUsedPrefixes([
            'getPlainText((texts) => texts.ui.button.cancel)',
        ]);
        expect(used.has('ui.button.cancel')).toBe(true);
    });

    test('captures a multi-line closure', () => {
        const used = collectUsedPrefixes([
            'locales.get(\n    (l) =>\n        l.gallery.preview.title,\n)',
        ]);
        expect(used.has('gallery.preview.title')).toBe(true);
    });

    test('captures a LocalePath static assignment', () => {
        const used = collectUsedPrefixes([
            'static readonly LocalePath = (l: LocaleText) => l.node.Block',
        ]);
        expect(used.has('node.Block')).toBe(true);
    });

    test('captures a Conflict LocalePath assignment', () => {
        const used = collectUsedPrefixes([
            'static readonly LocalePath = (locales: LocaleText) => locales.node.Row.conflict.UnexpectedColumnBind',
        ]);
        expect(used.has('node.Row.conflict.UnexpectedColumnBind')).toBe(true);
    });

    test('handles multiple accessors in one source', () => {
        const used = collectUsedPrefixes([
            `
            const a = locales.get((l) => l.ui.dialog.confirm);
            const b = locales.get((l) => l.node.Phrase.start);
            static readonly LocalePath = (l) => l.basis.Number;
            `,
        ]);
        expect(used.has('ui.dialog.confirm')).toBe(true);
        expect(used.has('node.Phrase.start')).toBe(true);
        expect(used.has('basis.Number')).toBe(true);
    });

    test('does not capture an unrelated `=>` arrow', () => {
        const used = collectUsedPrefixes([
            'items.map((item) => item.value)',
        ]);
        expect(used.size).toBe(0);
    });

    test('does not match when the arrow body references a different identifier', () => {
        // `other.x.y` shouldn't be captured even though it looks like a chain;
        // the captured chain must root at a known locale-store identifier.
        const used = collectUsedPrefixes(['thing((l) => other.x.y)']);
        expect(used.size).toBe(0);
    });

    test('captures direct property access on a locale-store identifier (no arrow)', () => {
        // Some call sites read the locale outside a closure — e.g.,
        // hooks.server.ts: `parsed.system?.unsupportedHeading`.
        const used = collectUsedPrefixes([
            'parsed.system.unsupportedHeading',
        ]);
        expect(used.has('system.unsupportedHeading')).toBe(true);
    });

    test('strips optional chaining from captured paths', () => {
        const used = collectUsedPrefixes([
            'parsed?.system?.unsupportedHeading',
        ]);
        expect(used.has('system.unsupportedHeading')).toBe(true);
    });

    test('captures HTML template substitutions', () => {
        // app.html uses %wordplay.system.noscript% style placeholders.
        const used = collectUsedPrefixes([
            '<p>%wordplay.system.noscript%</p>',
        ]);
        expect(used.has('system.noscript')).toBe(true);
    });

    test('captures tuple-body closures where the chain is not adjacent to `=>`', () => {
        // `locale.map((l) => [..., l.gallery.games])` — the chain comes after
        // other tokens following `=>`.
        const used = collectUsedPrefixes([
            'locale.map((l) => [localeToString(l), l.gallery.games])',
        ]);
        expect(used.has('gallery.games')).toBe(true);
    });
});
