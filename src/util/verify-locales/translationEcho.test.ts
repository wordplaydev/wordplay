import fs from 'fs';
import { describe, expect, test } from 'vitest';
import { isMachineTranslated } from '@locale/LocaleText';
import { withoutAnnotations } from '@locale/withoutAnnotations';
import type Tutorial from '../../tutorial/Tutorial';
import { TutorialModes } from '../../tutorial/TutorialMode';
import { getTutorialPath } from './TutorialSchema';

/**
 * Catch a locale whose tutorial is still English while claiming to be translated.
 *
 * `hi-IN`'s tutorial declared `language: "en"`, and that is the field the translator reads to
 * choose its target — so every run asked Claude to translate English into English and got the
 * English back. The results were written with `$~`, which reads as "machine translated, awaiting
 * review", so the locale looked finished. `npm run locales` was perfectly happy. Nobody would
 * have found it except by reading Hindi.
 *
 * ## What this compares, and why
 *
 * "Is this string still English?" has no useful answer on its own. Plenty of strings are meant to
 * be identical everywhere: `None` only ever says "…", the stream characters are onomatopoeia, and
 * `UnparsableExpression` speaks deliberate gibberish. A check that flagged those would cry wolf
 * on every locale forever.
 *
 * So this checks a *claim* instead. `$~` means the translator produced this string. If what it
 * produced is byte-identical to what it was given, it didn't translate it — whatever the reason.
 * Strings nobody claims (unmarked, or `$?`) are not evidence of anything and are left out.
 *
 * The separation is stark, which is what makes a threshold honest here: every healthy locale sits
 * at 4-5%, a handful of phrases a translator reasonably left alone. hi-IN sat at 92%.
 */

/** The share of a locale's machine translations that may still match the English. */
const MAX_ECHO = 0.25;

/** Below this many machine-translated strings, a percentage says nothing. */
const ENOUGH_TO_JUDGE = 20;

function load(path: string): Tutorial {
    return JSON.parse(fs.readFileSync(path, 'utf8')) as Tutorial;
}

/** Every dialog paragraph paired with its en-US source, by position. */
function pairs(source: Tutorial, target: Tutorial): [string, string][] {
    const found: [string, string][] = [];
    target.acts.forEach((act, a) =>
        act.scenes.forEach((scene, s) =>
            scene.lines.forEach((line, l) => {
                if (line === null || !Array.isArray(line)) return;
                const english = source.acts[a]?.scenes[s]?.lines[l];
                if (english === null || !Array.isArray(english)) return;
                line.slice(2).forEach((text, p) => {
                    const from = english[p + 2];
                    if (typeof text === 'string' && typeof from === 'string')
                        found.push([text, from]);
                });
            }),
        ),
    );
    return found;
}

describe('no locale is quietly still in English', () => {
    for (const mode of TutorialModes) {
        const source = load(getTutorialPath('en-US', mode));
        const locales = fs
            .readdirSync('static/locales')
            .filter(
                (locale) =>
                    locale !== 'en-US' &&
                    fs.existsSync(getTutorialPath(locale, mode)),
            );

        test(`every locale's ${mode} tutorial actually translated what it says it did`, () => {
            const echoing: string[] = [];
            for (const locale of locales) {
                const claimed = pairs(
                    source,
                    load(getTutorialPath(locale, mode)),
                ).filter(([text]) => isMachineTranslated(text));
                if (claimed.length < ENOUGH_TO_JUDGE) continue;
                const echoed = claimed.filter(
                    ([text, english]) =>
                        withoutAnnotations(text) ===
                        withoutAnnotations(english),
                );
                const rate = echoed.length / claimed.length;
                if (rate > MAX_ECHO)
                    echoing.push(
                        `${locale}: ${echoed.length}/${claimed.length} machine translations (${Math.round(rate * 100)}%) are still the English, e.g. ${JSON.stringify(withoutAnnotations(echoed[0][1]).slice(0, 50))}`,
                    );
            }

            expect(
                echoing,
                `Locale(s) marked strings "$~" — machine translated — that are byte-identical to the English they came from. The usual cause is the tutorial's own "language" field naming the wrong language: the translator reads it to choose a target, so it translates English into English and marks the result translated.`,
            ).toEqual([]);
        });
    }
});
