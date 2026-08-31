/**
 * Align a locale's tutorial to en-US's structure without touching a single
 * translated string.
 *
 * Everything that reads a tutorial across locales indexes it positionally —
 * `checkTutorial`'s link repair, TutorialView's multilingual echoes,
 * `TutorialPath`'s override keys, `Progress`'s saved act/scene/pause. Nothing
 * checks that two locales agree on what is at a given index, and nothing ever
 * has: en-US's Act 2 "Patterns" scene was added in `b539ef6e2` and propagated
 * to exactly one of the other 29 locales, silently, for as long as it has
 * existed. The only structural copy the tooling had was
 * `createUnwrittenTutorial`, which deep-copies en-US wholesale and destroys
 * every existing translation — usable for a brand-new locale and nothing else.
 *
 * This is the missing piece: a merge that inserts what en-US has gained, keeps
 * what the locale has already translated byte for byte, and reports what the
 * locale has that en-US doesn't rather than deleting it.
 *
 * ## Why aligning on signatures is trustworthy
 *
 * Only three things in a tutorial are translated: `title`, `subtitle`, and a
 * dialog line's paragraphs (index ≥ 2). A dialog's character and emotion, a
 * scene's `concept`, and every performance's mode, flags, theme, and template
 * reference are copied structurally and are byte-identical in all 30 locales.
 * The signatures below are built from exactly that set, so two entries match
 * when they are the same entry, not when they happen to sit at the same index.
 *
 * **A performance's literal code is deliberately not part of its identity.**
 * Wordplay's names are multilingual, and locales use that: es-MX writes
 * `Frase('🔘' 10m)` where en-US writes `Phrase('🔘' 10m)`, zh-CN translates the
 * string literals inside its examples, and es-MX points its Webpage lesson at
 * wordplay.dev rather than a US newspaper. All of that is the tutorial working
 * as intended, and a signature that read the code would call every one of
 * those a different lesson and duplicate it. A `#Template` reference *is* part
 * of the identity, because a template name is an en-US identifier that no
 * locale translates — and it is what keeps `#Symbol 💡` distinct from
 * `#PatternSearch`, and `#EvaluateDance3` from `#EvaluateDance4`.
 *
 * ## What it will not do
 *
 * It never deletes anything anybody translated. A scene, an act, or a dialog
 * line that a locale has and en-US doesn't is either drift or somebody's
 * hand-written work, and losing that is not recoverable from anything here —
 * those are reported and left in place.
 *
 * Performance lines and pauses are the exception, and are dropped when en-US
 * no longer has them: they hold no translated text, so nothing is lost, and
 * leaving them behind actively breaks the tutorial. Changing the finale's last
 * performance from `#EvaluateDance14` to `#EvaluateDance15` is exactly that
 * case — keep the old one and every locale ends the tutorial by showing the
 * dance twice, once with the music and once without.
 */

import { Revised, Unwritten } from '@locale/Annotations';
import { isRevised, isUnwritten } from '@locale/LocaleText';
import { withoutAnnotations } from '@locale/withoutAnnotations';
import type Tutorial from '../../tutorial/Tutorial';
import {
    isPerformance,
    parsePerformance,
    type Act,
    type Dialog,
    type Line,
    type Performance,
    type Scene,
} from '../../tutorial/Tutorial';

export type SyncChange = {
    /** Where it happened, 1-based, the way the tutorial's own URLs count. */
    act: number;
    scene?: number;
    line?: number;
    /** Something a human can recognize: a title, or a character's name. */
    label: string;
};

export type SyncReport = {
    inserted: (SyncChange & {
        kind: 'act' | 'scene' | 'line';
        strings: number;
    })[];
    /** Translated content en-US no longer has: reported, never applied. */
    removed: (SyncChange & { kind: 'act' | 'scene' | 'line' })[];
    /** Performances and pauses en-US no longer has: removed, since they hold
     * no translated text and leaving them behind breaks the lesson. */
    dropped: (SyncChange & { kind: 'line' })[];
    /** Paragraphs appended to a dialog line that en-US has grown, marked `$?`.
     * Kept out of `inserted` on purpose: the shipped-tutorial tests assert that
     * bucket is empty everywhere, and a paragraph is a different kind of gap
     * from a missing line. */
    padded: (SyncChange & { kind: 'line'; strings: number })[];
    /** Dialog lines whose paragraph counts disagree in a way the sync won't
     * touch: a paragraph inserted into the middle of an en-US line, or one this
     * locale has and en-US doesn't. Reported for a person, never applied. */
    unpaired: (SyncChange & {
        kind: 'line';
        source: number;
        target: number;
    })[];
    /** Strings that gained `$!` because en-US's changed. */
    revised: SyncChange[];
    /** Translated strings left exactly as they were. */
    aligned: number;
};

export type SyncOptions = {
    /** Propagate en-US's `$!` marks onto the aligned strings in the target. */
    propagateRevised: boolean;
};

export function isEmptyReport(report: SyncReport): boolean {
    return (
        report.inserted.length === 0 &&
        report.removed.length === 0 &&
        report.dropped.length === 0 &&
        report.padded.length === 0 &&
        report.unpaired.length === 0 &&
        report.revised.length === 0
    );
}

// ── Signatures ───────────────────────────────────────────────────────────────

/** A performance's untranslated identity: its mode, flags, theme, and — only
 * when it has one — the template it references. See the note above on why the
 * literal code is left out. */
function performanceSignature(performance: Performance): string {
    const parsed = parsePerformance(performance);
    const template =
        typeof parsed.code === 'string'
            ? ''
            : `#${parsed.code.name} ${parsed.code.inputs.join(' ')}`;
    return [
        parsed.mode,
        template,
        parsed.conflicts,
        parsed.sidebar,
        parsed.theme ?? '',
    ].join(':');
}

export function lineSignature(line: Line): string {
    if (line === null) return 'pause';
    if (isPerformance(line)) return `perf:${performanceSignature(line)}`;
    // A dialog's character and emotion, never its text.
    return `dialog:${line[0]}:${line[1]}`;
}

export function sceneSignature(scene: Scene): string {
    return `scene:${scene.concept ?? ''}:${performanceSignature(scene.performance)}`;
}

/**
 * An act is its title card, and nothing about the scenes inside it. Folding
 * the scenes in would be a stronger identity, and is wrong: a scene added to
 * an act would change that act's signature, so the act would fail to match and
 * be reinserted whole — throwing away every translation in it, which is the
 * one thing this file exists to prevent.
 *
 * A title card alone is enough to tell the acts apart because each one now
 * carries its own `theme`: Acts 1 and 7 share `#DarkVoid` and differ by it.
 * Two acts that were genuinely identical would still pair up in order, which
 * is the right answer anyway.
 */
export function actSignature(act: Act): string {
    return `act:${performanceSignature(act.performance)}`;
}

// ── Alignment ────────────────────────────────────────────────────────────────

type Alignment<T> =
    | { kind: 'keep'; source: T; target: T }
    | { kind: 'insert'; source: T }
    | { kind: 'remove'; target: T };

/**
 * A longest-common-subsequence merge of two arrays by signature. The arrays
 * here are tiny — at most 8 acts, 12 scenes, and a couple hundred lines — so a
 * plain O(n·m) table is the right amount of machinery.
 */
export function align<T>(
    source: readonly T[],
    target: readonly T[],
    signature: (item: T) => string,
): Alignment<T>[] {
    const a = source.map(signature);
    const b = target.map(signature);

    const table: number[][] = Array.from({ length: a.length + 1 }, () =>
        new Array<number>(b.length + 1).fill(0),
    );
    for (let i = a.length - 1; i >= 0; i--)
        for (let j = b.length - 1; j >= 0; j--)
            table[i][j] =
                a[i] === b[j]
                    ? table[i + 1][j + 1] + 1
                    : Math.max(table[i + 1][j], table[i][j + 1]);

    const result: Alignment<T>[] = [];
    let i = 0;
    let j = 0;
    while (i < a.length && j < b.length) {
        if (a[i] === b[j]) {
            result.push({ kind: 'keep', source: source[i], target: target[j] });
            i++;
            j++;
        } else if (table[i + 1][j] >= table[i][j + 1]) {
            // Present in en-US and not here: insert it.
            result.push({ kind: 'insert', source: source[i] });
            i++;
        } else {
            // Present here and not in en-US: keep it and say so.
            result.push({ kind: 'remove', target: target[j] });
            j++;
        }
    }
    for (; i < a.length; i++)
        result.push({ kind: 'insert', source: source[i] });
    for (; j < b.length; j++)
        result.push({ kind: 'remove', target: target[j] });
    return result;
}

/**
 * Which line of `source` each line of `target` corresponds to, by the same
 * alignment the sync uses. Keyed by line identity, so a caller walking the
 * target can ask for a counterpart without knowing anything about indices.
 *
 * This is what `checkTutorial` uses instead of `default.acts[a].scenes[s]
 * .lines[l]`: the moment a locale is one scene short, that indexing lines a
 * lesson up against a different lesson's dialog, and its link repair will
 * rewrite a correct translation with a stranger's concept.
 */
export function alignTutorialLines(
    source: Tutorial,
    target: Tutorial,
): Map<Line, Line> {
    const counterparts = new Map<Line, Line>();
    for (const actStep of align(source.acts, target.acts, actSignature)) {
        if (actStep.kind !== 'keep') continue;
        for (const sceneStep of align(
            actStep.source.scenes,
            actStep.target.scenes,
            sceneSignature,
        )) {
            if (sceneStep.kind !== 'keep') continue;
            for (const lineStep of align(
                sceneStep.source.lines,
                sceneStep.target.lines,
                lineSignature,
            ))
                if (lineStep.kind === 'keep' && lineStep.target !== null)
                    counterparts.set(lineStep.target, lineStep.source);
        }
    }
    return counterparts;
}

// ── Marking ──────────────────────────────────────────────────────────────────

function copy<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

/** The paragraphs of a dialog line — the only translated part of a line. */
function dialogText(line: Line): string[] | undefined {
    return line !== null && Array.isArray(line)
        ? (line as Dialog).slice(2)
        : undefined;
}

/**
 * What a paragraph and its translation still have in common.
 *
 * Paragraph text is translated, so it can't be compared directly — but concept
 * references (`@Phrase`, `@UI/editor`) are masked and restored around
 * translation, and `\…\` example code is never translated at all. Their order
 * is therefore the one durable signal that two paragraphs are the same
 * paragraph. A paragraph with neither fingerprints empty, which matches any
 * other empty one: the right reading when a line simply grew a tail, and the
 * reason a real signal is what has to disagree before we refuse.
 */
function paragraphFingerprint(text: string): string {
    return (
        text
            .match(/@[A-Za-z][\w/.-]*|\\[^\\]*\\/g)
            // A reference can end a sentence, and the punctuation that follows
            // is the translator's, not the reference's — `@editor.` and
            // `@editor。` are the same reference.
            ?.map((match) => match.replace(/[.-]+$/, ''))
            .join('\u0000') ?? ''
    );
}

/**
 * Whether the target's paragraphs are the source's first few, in order.
 *
 * This is what separates a line that grew a tail — safe to pad — from one that
 * gained a paragraph in the middle, where appending would be actively wrong:
 * `translateTutorial` resolves each paragraph's English by position, so a
 * placeholder appended after shifted survivors would translate the wrong
 * sentence and leave the shifted ones wrong too.
 */
function isCleanPrefix(source: string[], target: string[]): boolean {
    return target.every(
        (text, index) =>
            paragraphFingerprint(text) ===
            paragraphFingerprint(source[index] ?? ''),
    );
}

/**
 * Mark a translated string in an inserted node unwritten, so a later
 * translation run picks it up and `npm run locales` says so until it does.
 *
 * A bare marker, with no copy of the English behind it. Falling back to the
 * source locale is automatic at runtime, so carrying the English would only
 * duplicate it into 29 files and invite it to drift from the original. The
 * translator reads its source text from en-US for exactly this reason.
 */
function markUnwritten(): string {
    return Unwritten;
}

function markScene(scene: Scene): number {
    let count = 0;
    scene.title = markUnwritten();
    count++;
    if (scene.subtitle !== null) {
        scene.subtitle = markUnwritten();
        count++;
    }
    scene.lines = scene.lines.map((line) => {
        if (line === null || !Array.isArray(line)) return line;
        const dialog = line as Dialog;
        const marked: Dialog = [
            dialog[0],
            dialog[1],
            ...dialog.slice(2).map(() => {
                count++;
                return markUnwritten();
            }),
        ];
        return marked;
    });
    return count;
}

function markAct(act: Act): number {
    act.title = markUnwritten();
    return 1 + act.scenes.reduce((sum, scene) => sum + markScene(scene), 0);
}

function markLine(line: Line): number {
    const text = dialogText(line);
    if (text === undefined || line === null || !Array.isArray(line)) return 0;
    const dialog = line as Dialog;
    for (let index = 2; index < dialog.length; index++)
        dialog[index] = markUnwritten();
    return text.length;
}

// ── The merge ────────────────────────────────────────────────────────────────

/**
 * Propagate one `$!` from en-US onto the aligned target string.
 *
 * A `$~` machine translation is marked like any other: it is a translation of
 * a sentence that no longer says what it said, so it is now wrong, and "it was
 * translated by a machine" is not a reason to keep it. The marker *replaces*
 * the old one rather than stacking on it — `withoutAnnotations` first, which is
 * the same precaution `translateTutorial` documents for how `$~$~$~` happened.
 *
 * A `$?` target is left alone. It is already queued and still holds English;
 * `$!` would say nothing new and would lose the fact that it was never written.
 */
function propagate(sourceText: string, targetText: string): string | undefined {
    if (!isRevised(sourceText)) return undefined;
    if (isUnwritten(targetText) || isRevised(targetText)) return undefined;
    return `${Revised}${withoutAnnotations(targetText)}`;
}

export function syncTutorialStructure(
    source: Tutorial,
    target: Tutorial,
    options: SyncOptions,
): { tutorial: Tutorial; report: SyncReport } {
    const report: SyncReport = {
        inserted: [],
        removed: [],
        dropped: [],
        padded: [],
        unpaired: [],
        revised: [],
        aligned: 0,
    };

    function syncString(
        sourceText: string,
        targetText: string,
        where: SyncChange,
    ): string {
        report.aligned++;
        if (!options.propagateRevised) return targetText;
        const marked = propagate(sourceText, targetText);
        if (marked === undefined) return targetText;
        report.revised.push(where);
        return marked;
    }

    /**
     * Reconcile how many paragraphs a kept dialog line has.
     *
     * Nothing else does: the loop above walks the *target's* paragraphs, so a
     * paragraph en-US grew is never visited and one the locale has spare is
     * skipped, both in silence. That is how 23 locales went without the
     * paragraph defining "stage".
     */
    function syncParagraphs(
        dialog: Dialog,
        sourceText: string[],
        where: SyncChange,
    ): void {
        const targetText = dialog.slice(2);
        if (targetText.length === sourceText.length) return;
        const unpaired = {
            ...where,
            kind: 'line' as const,
            source: sourceText.length,
            target: targetText.length,
        };
        // More here than en-US has: somebody's writing, so it is reported and
        // kept, the same choice the merge makes for a whole line.
        if (targetText.length > sourceText.length) {
            report.unpaired.push(unpaired);
            return;
        }
        // Short, but the paragraphs it has are en-US's first few: append the
        // rest, unwritten, and a translation run fills them from the source.
        if (isCleanPrefix(sourceText, targetText)) {
            for (
                let index = targetText.length;
                index < sourceText.length;
                index++
            )
                dialog.push(markUnwritten());
            report.padded.push({
                ...where,
                kind: 'line',
                strings: sourceText.length - targetText.length,
            });
            return;
        }
        report.unpaired.push(unpaired);
    }

    function syncLines(
        sourceScene: Scene,
        targetScene: Scene,
        act: number,
        scene: number,
    ): Line[] {
        const lines: Line[] = [];
        for (const step of align(
            sourceScene.lines,
            targetScene.lines,
            lineSignature,
        )) {
            const line = lines.length;
            if (step.kind === 'insert') {
                const inserted = copy(step.source);
                const strings = markLine(inserted);
                report.inserted.push({
                    kind: 'line',
                    act,
                    scene,
                    line,
                    label: describeLine(step.source),
                    strings,
                });
                lines.push(inserted);
            } else if (step.kind === 'remove') {
                const where = {
                    kind: 'line' as const,
                    act,
                    scene,
                    line,
                    label: describeLine(step.target),
                };
                // A performance or a pause holds no translated text, so en-US
                // dropping it is a structural fact this locale should follow.
                // A dialog line is somebody's writing; that only gets reported.
                if (dialogText(step.target) === undefined)
                    report.dropped.push(where);
                else {
                    report.removed.push(where);
                    lines.push(step.target);
                }
            } else {
                const sourceText = dialogText(step.source);
                const targetLine = step.target;
                if (sourceText !== undefined && Array.isArray(targetLine)) {
                    const dialog = targetLine as Dialog;
                    for (let index = 2; index < dialog.length; index++) {
                        const from = sourceText[index - 2];
                        if (from === undefined) continue;
                        dialog[index] = syncString(from, dialog[index], {
                            act,
                            scene,
                            line,
                            label: describeLine(step.source),
                        });
                    }
                    syncParagraphs(dialog, sourceText, {
                        act,
                        scene,
                        line,
                        label: describeLine(step.source),
                    });
                }
                lines.push(targetLine);
            }
        }
        return lines;
    }

    function syncScenes(sourceAct: Act, targetAct: Act, act: number): Scene[] {
        const scenes: Scene[] = [];
        for (const step of align(
            sourceAct.scenes,
            targetAct.scenes,
            sceneSignature,
        )) {
            const scene = scenes.length + 1;
            if (step.kind === 'insert') {
                const inserted = copy(step.source);
                const strings = markScene(inserted);
                report.inserted.push({
                    kind: 'scene',
                    act,
                    scene,
                    label: step.source.title,
                    strings,
                });
                scenes.push(inserted);
            } else if (step.kind === 'remove') {
                report.removed.push({
                    kind: 'scene',
                    act,
                    scene,
                    label: step.target.title,
                });
                scenes.push(step.target);
            } else {
                const where = { act, scene, label: step.source.title };
                step.target.title = syncString(
                    step.source.title,
                    step.target.title,
                    where,
                );
                if (
                    step.source.subtitle !== null &&
                    step.target.subtitle !== null
                )
                    step.target.subtitle = syncString(
                        step.source.subtitle,
                        step.target.subtitle,
                        where,
                    );
                step.target.lines = syncLines(
                    step.source,
                    step.target,
                    act,
                    scene,
                );
                scenes.push(step.target);
            }
        }
        return scenes;
    }

    const result = copy(target);
    const acts: Act[] = [];
    for (const step of align(source.acts, result.acts, actSignature)) {
        const act = acts.length + 1;
        if (step.kind === 'insert') {
            const inserted = copy(step.source);
            const strings = markAct(inserted);
            report.inserted.push({
                kind: 'act',
                act,
                label: step.source.title,
                strings,
            });
            acts.push(inserted);
        } else if (step.kind === 'remove') {
            report.removed.push({
                kind: 'act',
                act,
                label: step.target.title,
            });
            acts.push(step.target);
        } else {
            const where = { act, label: step.source.title };
            step.target.title = syncString(
                step.source.title,
                step.target.title,
                where,
            );
            step.target.scenes = syncScenes(step.source, step.target, act);
            acts.push(step.target);
        }
    }
    result.acts = acts;

    return { tutorial: result, report };
}

function describeLine(line: Line): string {
    if (line === null) return 'pause';
    if (isPerformance(line)) {
        const parsed = parsePerformance(line);
        const code =
            typeof parsed.code === 'string'
                ? parsed.code
                : `#${parsed.code.name}`;
        return `${parsed.mode} ${code.substring(0, 40)}`;
    }
    return `${line[0]} (${line[1]})`;
}

/** A one-locale sync summary, in the shape `npm run locales` already prints. */
export function describeReport(report: SyncReport): string[] {
    const lines: string[] = [];
    for (const change of report.inserted)
        lines.push(
            `+ ${position(change)} "${withoutAnnotations(change.label)}" — inserted, ${change.strings} string(s) marked ${Unwritten}`,
        );
    for (const change of report.revised)
        lines.push(
            `! ${position(change)} — marked ${Revised} (revised in en-US)`,
        );
    for (const change of report.dropped)
        lines.push(
            `− ${position(change)} "${withoutAnnotations(change.label)}" — absent in en-US: dropped`,
        );
    for (const change of report.removed)
        lines.push(
            `− ${position(change)} "${withoutAnnotations(change.label)}" — here, absent in en-US: NOT removed`,
        );
    for (const change of report.padded)
        lines.push(
            `+ ${position(change)} "${withoutAnnotations(change.label)}" — ${change.strings} paragraph(s) en-US added, marked ${Unwritten}`,
        );
    for (const change of report.unpaired)
        lines.push(
            `? ${position(change)} "${withoutAnnotations(change.label)}" — ${change.target} paragraph(s) here against en-US's ${change.source}, and they don't line up: reconcile by hand`,
        );
    return lines;
}

function position(change: SyncChange): string {
    return [
        `act ${change.act}`,
        change.scene === undefined ? undefined : `scene ${change.scene}`,
        change.line === undefined ? undefined : `line ${change.line}`,
    ]
        .filter((part) => part !== undefined)
        .join(' ');
}
