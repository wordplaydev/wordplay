import { expect, test, vi } from 'vitest';

// Baselines need a Phrase, and a Phrase needs a canvas that node has not got.
// The ascent and descent are what matter here: they are font constants, while a
// phrase's box height is its ink, and that difference is the whole reason
// baseline alignment has to exist. Precedent: src/output/physics/contacts.test.ts.
vi.mock('@output/Output/getTextMetrics', () => ({
    default: (text: string, cssFont: string) => {
        const px = Number(/(\d+(?:\.\d+)?)px/.exec(cssFont)?.[1] ?? 64);
        return {
            width: text.length * 10 * (px / 64),
            // A short letter inks half as tall as a tall one.
            actualBoundingBoxAscent: (text === 'a' ? 0.3 : 0.7) * px,
            actualBoundingBoxDescent: 0,
            fontBoundingBoxAscent: 0.8 * px,
            fontBoundingBoxDescent: 0.2 * px,
        };
    },
}));

const { DB } = await import('@db/Database');
const { default: Project } = await import('@db/projects/Project');
const { default: DefaultLocale } = await import('@locale/DefaultLocale');
const { default: Locales } = await import('@locale/Locales');
const { default: concretize } = await import('@locale/concretize');
const { default: Source } = await import('@nodes/Source');
const { default: Evaluator } = await import('@runtime/Evaluator');
const { default: RenderContext } = await import('@output/RenderContext');
const { toRow } = await import('@output/Arrangement/Row');
const { DefaultSize } = await import('@output/Output/Stage');
const { toStage } = await import('@output/Output/Stage');
const { default: Phrase } = await import('@output/Output/Phrase');

const context = new RenderContext(
    DefaultLocale.ui.font.app,
    DefaultSize,
    new Locales(concretize, [DefaultLocale], DefaultLocale),
    new Set(),
    1,
    'horizontal-tb',
);

/** The phrases a stage program puts on stage, in order. */
function phrasesFrom(code: string) {
    const project = Project.make(
        null,
        'test',
        new Source('test', code),
        [],
        DefaultLocale,
    );
    const evaluator = new Evaluator(project, DB, [DefaultLocale]);
    const value = evaluator.getInitialValue();
    const stage = value ? toStage(evaluator, value) : undefined;
    if (stage === undefined) throw new Error(`no stage from ${code}`);
    return stage.content.filter((output) => output instanceof Phrase);
}

function rowOf(alignment: string) {
    const project = Project.make(
        null,
        'test',
        new Source('test', `Row('${alignment}' 0m)`),
        [],
        DefaultLocale,
    );
    const evaluator = new Evaluator(project, DB, [DefaultLocale]);
    const row = toRow(evaluator.getInitialValue());
    if (row === undefined) throw new Error('expected a Row');
    return row;
}

/** Where each child's baseline lands in the row's own frame. */
function baselines(
    alignment: string,
    code = `Stage([Phrase('a') Phrase('b')])`,
) {
    const children = phrasesFrom(code);
    const { places } = rowOf(alignment).getLayout(children, context);
    return places.map(
        ([output, place]) => place.y + (output.getBaselineOffset(context) ?? 0),
    );
}

/** Two letters of different ink height *and* different size. */
const MixedSizes = `Stage([Phrase('a' size: 1m) Phrase('b' size: 2m)])`;

test('a row can line its children up by baseline rather than by box', () => {
    const [a, b] = baselines('_');
    expect(a).toBeCloseTo(b, 5);
});

test('aligning to an edge leaves different letters on different baselines', () => {
    // A phrase's box is its ink, so a short `a` and a tall `b` flush to the same
    // edge do not share a baseline. This is what the option exists to fix.
    for (const alignment of ['<', '>']) {
        const [a, b] = baselines(alignment);
        expect(a, `alignment ${alignment}`).not.toBeCloseTo(b, 5);
    }
});

test('centring happens to align baselines, but only at one size', () => {
    // Worth pinning because it is surprising and easy to mistake for a fix:
    // a baseline sits (height + descent − ascent) / 2 above the box bottom, and
    // centring adds (rowHeight − height) / 2, so height cancels — as long as the
    // font metrics are the same. Change the size and it stops working, while
    // baseline alignment goes on holding.
    const [sameA, sameB] = baselines('|');
    expect(sameA).toBeCloseTo(sameB, 5);

    const [mixedA, mixedB] = baselines('|', MixedSizes);
    expect(mixedA).not.toBeCloseTo(mixedB, 5);

    const [alignedA, alignedB] = baselines('_', MixedSizes);
    expect(alignedA).toBeCloseTo(alignedB, 5);
});

test('a baseline row is tall enough for everything it holds', () => {
    const children = phrasesFrom(`Stage([Phrase('a') Phrase('b')])`);
    const layout = rowOf('_').getLayout(children, context);
    for (const [output, place] of layout.places) {
        expect(place.y).toBeGreaterThanOrEqual(-1e-9);
        expect(place.y + output.getLayout(context).height).toBeLessThanOrEqual(
            layout.height + 1e-9,
        );
    }
});
