import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { describe, expect, test } from 'vitest';
import type Tutorial from '../../tutorial/Tutorial';
import { TourIDs, Tours, isTourID, type TourID } from './tours';
import { TourSteps } from './tourSteps';

/** Anything whose name ends in `uiid` — `data-uiid`, a widget's `uiid` prop,
 *  `addUiid`, a Command's `uiid:` field — paired with its value. */
const Assignment = /[A-Za-z-]*[Uu]iid\s*[=:]\s*(\{[^}]*\}|["'][^"']*["'])/g;

/** Every quoted literal inside such a value, so a conditional
 *  (`uiid={set ? 'paletteUnset' : 'paletteSet'}`) contributes both of its
 *  arms. A value with no literal at all (`data-uiid={node.getDescriptor()}`)
 *  contributes nothing, which is right: no tour points at a computed id, and a
 *  sweep that guessed at them would stop failing. */
const Literal = /["']([A-Za-z0-9_-]+)["']/g;

/** These two name every uiid a tour points at, so neither counts as a target
 *  — otherwise the sweep would always find itself. */
const NotTargets = ['tourSteps.ts', 'tours.test.ts'];

function readTargets(dir: string, found: Set<string>) {
    for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) readTargets(path, found);
        else if (/\.svelte$|\.ts$/.test(entry) && !NotTargets.includes(entry)) {
            const source = readFileSync(path, 'utf8');
            for (const assignment of source.matchAll(Assignment))
                for (const literal of assignment[1].matchAll(Literal))
                    found.add(literal[1]);
        }
    }
}

const Targets = new Set<string>();
readTargets('src', Targets);

describe.each(TourIDs)('the %s tour', (id: TourID) => {
    const steps = TourSteps[id];

    test('has a name and steps', () => {
        expect(Tours[id]).toBeDefined();
        expect(steps.length).toBeGreaterThan(0);
    });

    /** A step whose target has been renamed or removed doesn't fail: it renders
     *  "this part of the interface isn't currently visible" and looks like the
     *  control merely being off screen. That is how the source tour's `expand`
     *  step pointed at nothing for months. */
    test.each(steps.map((step, index) => [index, step.uiid] as const))(
        'step %i points at a real target (%s)',
        (_index, uiid) => {
            expect(Targets).toContain(uiid);
        },
    );
});

/** A `@Tour/<id>` naming a tour that doesn't exist renders as the raw reference.
 *  `npm run locales` catches it through ConceptLink.isValid, but only in CI's
 *  locale job; this catches it in the unit suite, where a rename is made. */
test('every @Tour reference in every locale names a real tour', () => {
    const bad: string[] = [];
    const locales = 'static/locales';
    for (const locale of readdirSync(locales)) {
        const dir = join(locales, locale);
        if (!statSync(dir).isDirectory()) continue;
        for (const file of readdirSync(dir)) {
            if (!file.endsWith('.json')) continue;
            const path = join(dir, file);
            for (const match of readFileSync(path, 'utf8').matchAll(
                /@[Tt]our\/([A-Za-z0-9_-]*)/g,
            ))
                if (!isTourID(match[1])) bad.push(`${path}: ${match[0]}`);
        }
    }
    expect(bad).toEqual([]);
});

/**
 * A tour a lesson points at has to be offered in every language, and nothing
 * else checks that. Paragraph counts within a dialog line are not synced across
 * locales — `syncTutorialStructure` aligns whole lines — so a `@Tour/` written
 * into a paragraph en-US has and others don't reaches only the locales that
 * happen to have it, silently. Two of the first five did exactly that.
 */
describe('every locale is offered the tours the lessons point at', () => {
    const Modes = [
        ['complete', '-tutorial.json'],
        ['quick', '-tutorial-quick.json'],
    ] as const;
    const locales = readdirSync('static/locales').filter(
        (name) =>
            statSync(join('static/locales', name)).isDirectory() &&
            name !== 'en-US',
    );

    function read(locale: string, suffix: string): Tutorial | undefined {
        const path = join('static/locales', locale, `${locale}${suffix}`);
        try {
            return JSON.parse(readFileSync(path, 'utf8'));
        } catch {
            return undefined;
        }
    }

    for (const [mode, suffix] of Modes) {
        const source = read('en-US', suffix);
        const pointers: [number, number, number, number, string][] = [];
        source?.acts.forEach((act, ai) =>
            act.scenes.forEach((scene, si) =>
                scene.lines.forEach((line, li) => {
                    if (!Array.isArray(line)) return;
                    line.slice(2).forEach((paragraph, pi) => {
                        const ref = String(paragraph).match(/@[Tt]our\/\w+/);
                        if (ref) pointers.push([ai, si, li, pi, ref[0]]);
                    });
                }),
            ),
        );

        test.each(pointers)(
            `${mode} act %i scene %i line %i paragraph %i offers %s in every locale`,
            (ai, si, li, pi, ref) => {
                // The reference itself, not just the paragraph's existence: a
                // paragraph inserted into the middle of an en-US line leaves
                // every locale's later indices holding the paragraph before,
                // so an index that exists can still be the wrong paragraph.
                const without = locales.filter((locale) => {
                    const line = read(locale, suffix)?.acts[ai]?.scenes[si]
                        ?.lines[li];
                    if (!Array.isArray(line) || line.length - 2 <= pi)
                        return true;
                    return !String(line[pi + 2]).includes(ref);
                });
                expect(without).toEqual([]);
            },
        );
    }
});

test('tour ids are recognized, and nothing else is', () => {
    for (const id of TourIDs) expect(isTourID(id)).toBe(true);
    expect(isTourID('nope')).toBe(false);
    expect(isTourID('')).toBe(false);
});
