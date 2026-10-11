import { expect, test } from 'vitest';
import { DB } from '#db/Database.ts';
import Project from '#db/projects/Project.ts';
import DefaultLocale from '#locale/DefaultLocale.ts';
import Locales from '#locale/Locales.ts';
import concretize from '#locale/concretize.ts';
import Source from '#nodes/Source.ts';
import { toStage } from '#output/Output/Stage.ts';
import analyzeOutput, { MinFlashHz } from '#output/PhotosensitivityAnalysis.ts';
import Evaluator from '#runtime/Evaluator.ts';
import { Blur } from '#output/Effect/Blur.ts';
import { Damage } from '#output/Effect/Damage.ts';
import { Flicker, flickerDip, MaxFlickerRate } from '#output/Effect/Flicker.ts';
import { effectColor } from '#output/Effect/Effect.ts';
import { Grade } from '#output/Effect/Grade.ts';
import { Grain } from '#output/Effect/Grain.ts';
import { Haze } from '#output/Effect/Haze.ts';
import { Scanlines } from '#output/Effect/Scanlines.ts';
import { Tint } from '#output/Effect/Tint.ts';
import { Vignette } from '#output/Effect/Vignette.ts';
import { Wave } from '#output/Effect/Wave.ts';

function stageOf(code: string) {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const evaluator = new Evaluator(project, DB, [DefaultLocale], false);
    const value = evaluator.getInitialValue();
    const stage = value ? toStage(evaluator, value) : undefined;
    if (stage === undefined) throw new Error(`No stage from ${code}`);
    return stage;
}

const locales = new Locales(concretize, [DefaultLocale], DefaultLocale);

test.each([
    ['Blur()', Blur],
    ['Grade()', Grade],
    ['Tint(Color(50% 50 200°))', Tint],
    ['Haze()', Haze],
    ['Grain()', Grain],
    ['Scanlines()', Scanlines],
    ['Wave()', Wave],
    ['Damage()', Damage],
    ['Flicker()', Flicker],
    ['Vignette()', Vignette],
])('%s becomes an effect on the stage', (code, kind) => {
    const stage = stageOf(`Stage([Phrase('a')] effects: [${code}])`);
    expect(stage.effects).toHaveLength(1);
    expect(stage.effects[0]).toBeInstanceOf(kind);
});

test('effects keep their order', () => {
    const stage = stageOf(
        `Stage([Phrase('a')] effects: [Grain() Blur() Vignette()])`,
    );
    expect(stage.effects.map((effect) => effect.constructor)).toEqual([
        Grain,
        Blur,
        Vignette,
    ]);
});

test('a stage without effects has none', () => {
    expect(stageOf(`Stage([Phrase('a')])`).effects).toEqual([]);
    expect(stageOf(`Phrase('a')`).effects).toEqual([]);
});

test('effects do not disturb the inputs before them', () => {
    const stage = stageOf(
        `Stage([Phrase('a')] gravity: 3m/s^2 overlay: [Phrase('hud')] air: 0 effects: [Blur()])`,
    );
    expect(stage.gravity).toBe(3);
    expect(stage.overlay).toHaveLength(1);
    expect(stage.air).toBe(0);
    expect(stage.effects).toHaveLength(1);
});

test('settings are read and clamped', () => {
    const [grain] = stageOf(
        `Stage([Phrase('a')] effects: [Grain(150% size: 3)])`,
    ).effects;
    expect(grain).toBeInstanceOf(Grain);
    if (grain instanceof Grain) {
        expect(grain.amount).toBe(1);
        expect(grain.size).toBe(3);
    }
});

test('a flicker can never reach the photosensitive band', () => {
    expect(MaxFlickerRate).toBeLessThan(MinFlashHz);
    const [flicker] = stageOf(
        `Stage([Phrase('a')] effects: [Flicker(50% 30)])`,
    ).effects;
    expect(flicker).toBeInstanceOf(Flicker);
    if (flicker instanceof Flicker)
        expect(flicker.rate).toBeLessThanOrEqual(MaxFlickerRate);
});

test('heavy grain and scanlines are reported as patterns, light ones are not', () => {
    expect(
        analyzeOutput(
            stageOf(`Stage([Phrase('a')] effects: [Grain(90%)])`),
        ).has('pattern'),
    ).toBe(true);
    expect(
        analyzeOutput(
            stageOf(`Stage([Phrase('a')] effects: [Scanlines(80%)])`),
        ).has('pattern'),
    ).toBe(true);
    expect(
        analyzeOutput(
            stageOf(
                `Stage([Phrase('a')] effects: [Grain(20%) Scanlines(20%)])`,
            ),
        ).has('pattern'),
    ).toBe(false);
});

test('the stage description names its effects, and changes when they do', () => {
    const plain = stageOf(`Stage([Phrase('a')])`).getDescription(locales);
    const blurred = stageOf(
        `Stage([Phrase('a')] effects: [Blur()])`,
    ).getDescription(locales);
    const grainy = stageOf(
        `Stage([Phrase('a')] effects: [Blur() Grain()])`,
    ).getDescription(locales);
    expect(blurred).toContain('Blur');
    expect(grainy).toContain('Grain');
    expect(new Set([plain, blurred, grainy]).size).toBe(3);
});

test('a flicker mostly holds steady, and never stutters more than three times in a second', () => {
    const step = 0.005;
    const onsets: number[] = [];
    let steady = 0;
    let samples = 0;
    let was = 0;
    for (let t = 0; t < 120; t += step) {
        const dip = flickerDip(t, MaxFlickerRate);
        if (dip > 0 && was === 0) onsets.push(t);
        if (dip === 0) steady++;
        samples++;
        was = dip;
    }
    expect(onsets.length).toBeGreaterThan(0);
    expect(steady / samples).toBeGreaterThan(0.8);
    for (const onset of onsets)
        expect(
            onsets.filter((other) => other >= onset && other < onset + 1)
                .length,
        ).toBeLessThanOrEqual(3);
});

test('a still flicker is undimmed', () => {
    expect(flickerDip(0, MaxFlickerRate)).toBe(0);
});

test('built-in effect colors follow dark-canvas adaptation', () => {
    expect(effectColor(0, 0, 0, 1, false)).toBe('lch(0% 0 0deg / 1)');
    expect(effectColor(0, 0, 0, 1, true)).toBe('lch(100% 0 0deg / 1)');
});
