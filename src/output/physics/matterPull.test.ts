import { DB } from '@db/Database';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import Source from '@nodes/Source';
import { toMatter } from '@output/physics/Matter';
import { DefaultAir, toStage } from '@output/Output/Stage';
import Evaluator from '@runtime/Evaluator';
import { expect, test } from 'vitest';

/**
 * Matter.pull and Stage.air are appended to their structures rather than
 * inserted, because both are read positionally — Matter destructures
 * getOutputInputs in order and Stage reads gravity and overlay at hardcoded
 * indexes. These check that every older way of writing the two still means what
 * it meant, which is what appending buys.
 */

function evaluate(code: string) {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const evaluator = new Evaluator(project, DB, [DefaultLocale]);
    evaluator.start();
    return { evaluator, value: evaluator.getLatestSourceValue(source) };
}

function stageFrom(code: string) {
    const { evaluator, value } = evaluate(code);
    if (value === undefined) throw new Error('expected a value');
    const stage = toStage(evaluator, value);
    evaluator.stop();
    if (stage === undefined) throw new Error('expected a Stage value');
    return stage;
}

function matterFrom(code: string) {
    const { evaluator, value } = evaluate(code);
    const matter = toMatter(value);
    evaluator.stop();
    if (matter === undefined) throw new Error('expected a Matter value');
    return matter;
}

test('Matter reads pull', () => {
    expect(matterFrom('Matter(1000kg pull: 2)').pull).toBe(2);
});

test('a negative pull survives, since that is how output pushes', () => {
    expect(matterFrom('Matter(pull: -1.5)').pull).toBe(-1.5);
});

test('Matter written the old way still means the old thing', () => {
    // Every Matter in every saved project predates pull, so all of them must
    // land on 0 — not attracting is what they have always done.
    expect(matterFrom('Matter()').pull).toBe(0);
    const positional = matterFrom('Matter(0.45kg 0.7 0.02)');
    expect(positional.pull).toBe(0);
    // And appending must not have shifted anything ahead of it.
    expect(positional.mass).toBe(0.45);
    expect(positional.bounciness).toBe(0.7);
    expect(positional.friction).toBe(0.02);
    expect(positional.text).toBe(true);
    expect(positional.shapes).toBe(true);
});

test('Stage reads air, and defaults it to ordinary air', () => {
    expect(stageFrom(`Stage([] air: 0)`).air).toBe(0);
});

test('a Stage written the old way keeps ordinary air and its gravity', () => {
    // gravity is read at a hardcoded index 22 and overlay at 23, so air had to
    // append at 24. If it had been inserted earlier, this gravity would be wrong.
    const stage = stageFrom(`Stage([] gravity: 3m/s^2)`);
    expect(stage.gravity).toBe(3);
    expect(stage.air).toBe(DefaultAir);
});
