import { DB } from '@db/Database';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import NodeRef from '@locale/NodeRef';
import ValueRef from '@locale/ValueRef';
import type Markup from '@nodes/Markup';
import Source from '@nodes/Source';
import Evaluator from '@runtime/Evaluator';
import { getMatchLoop } from '@runtime/pattern/matchSteps';
import { expect, test } from 'vitest';

function evaluatorFor(code: string): Evaluator {
    const project = Project.make(null, 'test', new Source('test', code), [], [
        DefaultLocale,
    ]);
    return new Evaluator(project, DB, [DefaultLocale]);
}

/** Recursively gather every NodeRef/ValueRef in a narration's markup. */
function refsOf(markup: Markup): { nodes: NodeRef[]; values: ValueRef[] } {
    const nodes: NodeRef[] = [];
    const values: ValueRef[] = [];
    const visit = (segment: unknown) => {
        if (segment instanceof NodeRef) nodes.push(segment);
        else if (segment instanceof ValueRef) values.push(segment);
        else if (
            segment &&
            typeof segment === 'object' &&
            'segments' in segment &&
            Array.isArray((segment as { segments: unknown[] }).segments)
        )
            (segment as { segments: unknown[] }).segments.forEach(visit);
    };
    markup.paragraphs.forEach((p) => p.segments.forEach(visit));
    return { nodes, values };
}

/** Collect each match beat's narration markup while editor-stepping a program. */
function beatMarkups(code: string): Markup[] {
    const evaluator = evaluatorFor(code);
    evaluator.pause();
    evaluator.start();
    const out: Markup[] = [];
    let i = 0;
    while (!evaluator.isDone() && i < 300) {
        evaluator.stepWithinProgram();
        const step = evaluator.getCurrentStep();
        if (step && getMatchLoop(evaluator)?.snapshot)
            out.push(step.getExplanations(DefaultLocales, evaluator));
        i++;
    }
    return out;
}

type Beat = {
    kind: string;
    pos: number;
    matched: boolean | undefined;
    glyph: string | undefined;
};

/** Step a program to completion, collecting any match-state snapshots seen. */
function run(code: string): {
    steps: number;
    positions: number[];
    beats: Beat[];
} {
    const evaluator = evaluatorFor(code);
    evaluator.pause(); // step mode: start() won't run to completion
    evaluator.start();
    const positions: number[] = [];
    const beats: Beat[] = [];
    let steps = 0;
    let lastSnapshot;
    while (!evaluator.isDone() && steps < 100000) {
        evaluator.step();
        steps++;
        const loop = getMatchLoop(evaluator);
        if (loop?.snapshot && loop.snapshot !== lastSnapshot) {
            lastSnapshot = loop.snapshot;
            positions.push(loop.snapshot.pos);
            beats.push({
                kind: loop.snapshot.kind,
                pos: loop.snapshot.pos,
                matched: loop.snapshot.matched,
                glyph: loop.snapshot.glyph,
            });
        }
    }
    return { steps, positions, beats };
}

test('matching is stepwise: more atoms take more steps', () => {
    // Each atom attempt is a discrete Evaluator step, so a longer pattern over a
    // longer text takes strictly more steps than a one-atom match.
    const few = run("'a' ≈ ⣿_⣿").steps;
    const many = run("'abcdef' ≈ ⣿_ _ _ _ _ _⣿").steps;
    expect(many).toBeGreaterThan(few);
});

test('the match state is observable and the position advances', () => {
    // While stepping `'a1' ≈ ⣿_ #⣿`, the inspectable snapshot walks the text:
    // it tries the letter at position 0, then the digit at position 1.
    const { positions } = run("'a1' ≈ ⣿_ #⣿");
    expect(positions).toContain(0);
    expect(positions).toContain(1);
    // Positions are observed in non-decreasing order (left to right).
    const sorted = [...positions].sort((a, b) => a - b);
    expect(positions).toEqual(sorted);
});

test('each grapheme attempt is a discrete, observable beat with its outcome', () => {
    // The user's example: searching `hello5` for one-or-more digits should try
    // the digit class against each letter (no), then the digit (yes), then a
    // quantifier summary — every beat single-stepped and self-describing.
    const { beats } = run("'hello5' ⌕ ⣿>0 #⣿");
    // A search announces each scan position…
    expect(beats.some((b) => b.kind === 'scan')).toBe(true);
    // …the digit class misses h, e, l, l, o at positions 0–4…
    const misses = beats.filter(
        (b) => b.kind === 'atom' && b.matched === false,
    );
    expect(misses.map((b) => b.glyph)).toEqual(
        expect.arrayContaining(['h', 'e', 'l', 'o']),
    );
    // …then matches the digit 5…
    expect(
        beats.some(
            (b) => b.kind === 'atom' && b.matched === true && b.glyph === '5',
        ),
    ).toBe(true);
    // …and the quantifier reports it was satisfied.
    expect(
        beats.some((b) => b.kind === 'quantifier' && b.matched === true),
    ).toBe(true);
});

test('every match step narrates without throwing, with non-empty text', () => {
    // The narration templates must concretize for every beat kind (scan, atom
    // hit/miss/end, quantifier) — a malformed template would throw here.
    const evaluator = evaluatorFor("'hello5' ⌕ ⣿>0 #⣿");
    evaluator.pause();
    evaluator.start();
    let sawMatchNarration = false;
    let steps = 0;
    while (!evaluator.isDone() && steps < 100000) {
        const step = evaluator.getCurrentStep();
        const loop = getMatchLoop(evaluator);
        if (step && loop?.snapshot) {
            const markup = step.getExplanations(DefaultLocales, evaluator);
            expect(markup.toText().length).toBeGreaterThan(0);
            sawMatchNarration = true;
        }
        evaluator.step();
        steps++;
    }
    expect(sawMatchNarration).toBe(true);
});

test('the editor step button stops at each match beat (stepWithinProgram)', () => {
    // The bug: a whole match ran in a single click because the loop steps carry
    // a basis node not in the program. The step button (stepWithinProgram) must
    // stop on the per-grapheme beats and narrate them, not skip the lot.
    const markups = beatMarkups("'hello5' ⌕ ⣿>0 #⣿");
    // We saw many discrete beats — the play-by-play, not one opaque jump.
    expect(markups.length).toBeGreaterThan(8);
    // The matched grapheme 5 is shown as a text VALUE (a ValueRef), and h/e/l/o
    // appear as values on the missing beats — not flattened into plain text.
    const valueTexts = markups.flatMap((m) =>
        refsOf(m).values.map((v) => v.value.toString()),
    );
    expect(valueTexts).toEqual(expect.arrayContaining(['"h"', '"5"']));
    // The quantifier verdict still reads as words.
    expect(markups.some((m) => /enough/.test(m.toText()))).toBe(true);
});

test('atoms render as code NodeViews and matched text as value views', () => {
    // The user's ask: an atom is a NodeView (code), quoted/matched text is a
    // value view — not all plain text. Every match/miss beat carries a NodeRef
    // for the construct and a ValueRef for the grapheme.
    const markups = beatMarkups("'a1' ≈ ⣿_ #⣿");
    const atomBeats = markups.filter((m) => {
        const { nodes, values } = refsOf(m);
        return nodes.length > 0 && values.length > 0;
    });
    expect(atomBeats.length).toBeGreaterThan(0);
    // The construct refs point at real pattern nodes (class atoms here).
    const nodeNames = markups.flatMap((m) =>
        refsOf(m).nodes.map((n) => n.node.constructor.name),
    );
    expect(nodeNames).toContain('PatternClass');
    // The matched graphemes show up as text values.
    const valueTexts = markups.flatMap((m) =>
        refsOf(m).values.map((v) => v.value.toString()),
    );
    expect(valueTexts).toEqual(expect.arrayContaining(['"a"', '"1"']));
});

test('narration covers every atom kind, not just digit classes', () => {
    // Guard against narration that only fits one construct. Collect the full
    // play-by-play for patterns exercising each control-flow path and assert the
    // wording fits each kind — zero-width anchors/edges "hold", they don't "need
    // a character"; literals/sets/classes/quantifiers read sensibly.
    const narrate = (code: string): string[] =>
        beatMarkups(code).map((m) => m.toText());

    // Anchors are zero-width: they hold (or don't) — never "need a character".
    const anchors = narrate("'a' ≈ ⣿⊢ _ ⊣⣿");
    expect(anchors.filter((n) => /holds at position/.test(n)).length).toBe(2);
    expect(anchors.some((n) => /needs a character/.test(n))).toBe(false);

    // A failing end-anchor reports "doesn't hold", not an off-the-end message.
    const failingAnchor = narrate("'ab' ≈ ⣿⊢ _ ⊣⣿");
    expect(failingAnchor.some((n) => /doesn't hold/.test(n))).toBe(true);
    expect(failingAnchor.some((n) => /needs a character/.test(n))).toBe(false);

    // Captures/groups/sets: the set narrates, the quantifier tallies, the capture
    // is transparent. Every beat is non-empty and none throws.
    const email = narrate(
        "'a@b.co' ≈ ⣿u: (>0 {_ #}) \"@\" h: (>0 _) \".\" (>0 _)⣿",
    );
    expect(email.length).toBeGreaterThan(6);
    expect(email.every((n) => n.length > 0)).toBe(true);
    expect(email.some((n) => /matched .* enough/.test(n))).toBe(true);
});

test('backward stepping stops at match beats, symmetric with forward', () => {
    // Forward stepping (stepWithinProgram) stops at each beat; stepping back
    // (stepBackWithinProgram, the editor's back button) must too — otherwise it
    // skips the whole match to the prior program node ("jumps to the start").
    const evaluator = evaluatorFor("'hello5' ⌕ ⣿>0 #⣿");
    evaluator.pause();
    evaluator.start();
    // Step forward to a point well inside the match.
    let forwardBeats = 0;
    while (!evaluator.isDone() && forwardBeats < 6) {
        evaluator.stepWithinProgram();
        if (getMatchLoop(evaluator)?.snapshot) forwardBeats++;
    }
    expect(getMatchLoop(evaluator)?.snapshot).toBeDefined();
    const posBefore = getMatchLoop(evaluator)?.snapshot?.pos;
    // One step back should land on a match beat (still inside the match), not
    // jump out to the operator.
    evaluator.stepBackWithinProgram();
    const loopAfter = getMatchLoop(evaluator);
    expect(loopAfter?.snapshot).toBeDefined();
    // It moved (a different/earlier beat), proving it didn't skip the match.
    expect(loopAfter?.snapshot?.pos).not.toBeGreaterThan(posBefore ?? 0);
});

test('a stepped match can be stepped backward (reversibility)', () => {
    const evaluator = evaluatorFor("'abc' ≈ ⣿_ _ _⣿");
    evaluator.pause();
    evaluator.start();
    // Step a few times into the match.
    for (let i = 0; i < 6 && !evaluator.isDone(); i++) evaluator.step();
    const before = evaluator.getStepIndex();
    evaluator.stepBack();
    expect(evaluator.getStepIndex()).toBeLessThan(before);
    // Finishing still yields the correct result after time travel.
    while (!evaluator.isDone()) evaluator.step();
    expect(evaluator.getLatestSourceValue(evaluator.project.getMain())?.toString()).toBe(
        '⊤',
    );
});
