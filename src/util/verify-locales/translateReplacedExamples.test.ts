import { expect, test } from 'vitest';
import { readFileSync, copyFileSync, rmSync } from 'fs';
import { toDocString } from '@locale/LocaleText';
import { getKeyTemplatePairs } from '@util/verify-locales/LocalePath';
import getDocExamples from '@util/verify-locales/docExamples';
import { localizeFile, type Localizer } from './translateReplacedExamples';

const SRC = 'static/locales/de-DE/de-DE.json';
const TMP = 'static/locales/de-DE/de-DE.localizetest.json';

/** Set of en-US example codes per doc path (an example is "still English" if its code is in here). */
function enCodes(): Map<string, Set<string>> {
    const en = JSON.parse(readFileSync('src/locale/en-US.json', 'utf8'));
    const m = new Map<string, Set<string>>();
    for (const p of getKeyTemplatePairs(en)) {
        if (p.key !== 'doc') continue;
        m.set(p.toString(), new Set(getDocExamples(toDocString(p.value as any)).map((e) => e.code)));
    }
    return m;
}

test('localizeFile only targets English (en-matching), non-🪲 examples and substitutes them', async () => {
    copyFileSync(SRC, TMP);
    try {
        const seen: string[] = [];
        // Mock localizer: record the code it was given (sans delimiters) and return a marker example.
        const mock: Localizer = async (codeWithDelims) => {
            seen.push(codeWithDelims.replace(/^\\|\\$/g, ''));
            return '\\1 + 1\\';
        };

        const res = await localizeFile(TMP, mock, false);

        // It localized at least some examples, and every example it touched was still-English.
        expect(res.localized).toBeGreaterThan(0);
        const en = enCodes();
        const allEnCodes = new Set<string>();
        for (const s of en.values()) for (const c of s) allEnCodes.add(c);
        for (const code of seen) expect(allEnCodes.has(code)).toBe(true);

        // The written file is valid JSON, and no 🪲-annotated example was altered to the marker
        // (we only ever replace bare English examples, never annotated ones).
        const after = JSON.parse(readFileSync(TMP, 'utf8'));
        let defectMarkers = 0;
        for (const p of getKeyTemplatePairs(after)) {
            if (p.key !== 'doc') continue;
            for (const ex of getDocExamples(toDocString(p.value as any)))
                if (ex.expectsDefect) defectMarkers++;
        }
        // 🪲 examples survive untouched (same count as the source).
        const before = JSON.parse(readFileSync(SRC, 'utf8'));
        let defectBefore = 0;
        for (const p of getKeyTemplatePairs(before)) {
            if (p.key !== 'doc') continue;
            for (const ex of getDocExamples(toDocString(p.value as any)))
                if (ex.expectsDefect) defectBefore++;
        }
        expect(defectMarkers).toBe(defectBefore);
    } finally {
        rmSync(TMP, { force: true });
    }
});
