import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import Project from '@db/projects/Project';
import Evaluate from '@nodes/Evaluate';
import Source from '@nodes/Source';
import OutputExpression from '@edit/output/OutputExpression';
import { makesSequence } from '@output/animation/Sequence';
import { expect, test } from 'vitest';

/** The last Evaluate in the source — the animation expression in each case below. */
function lastEvaluate(code: string) {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    project.analyze();
    const evaluates = source.nodes((n): n is Evaluate => n instanceof Evaluate);
    return { project, evaluate: evaluates[evaluates.length - 1], source };
}

// The palette decides what editor to show by asking what an Evaluate is. A predefined
// animation evaluates a `↑` static function rather than the Sequence structure, so without
// these it silently falls through and the sequence editor never appears.
test.each([
    ['Sequence({0%: Pose(rotation: 0°) 100%: Pose(rotation: 90°)})'],
    ['Sequence.sway()'],
    ['Sequence.sway(10° 1s)'],
])('%s counts as making a Sequence', (code) => {
    const { project, evaluate, source } = lastEvaluate(code);
    expect(makesSequence(project, evaluate, project.getContext(source))).toBe(
        true,
    );
});

test('a non-Sequence evaluate does not', () => {
    const { project, evaluate, source } = lastEvaluate("Phrase('hi')");
    expect(makesSequence(project, evaluate, project.getContext(source))).toBe(
        false,
    );
});

test('an animation is editable output typed as Sequence', () => {
    const { project, evaluate } = lastEvaluate('Sequence.sway()');
    const output = new OutputExpression(project, evaluate, DefaultLocales);
    expect(output.isOutput()).toBe(true);
    expect(output.getType()).toBe(project.shares.output.Sequence);
});

test("an animation's pass-through inputs read like Sequence's own", () => {
    const { project, evaluate } = lastEvaluate('Sequence.sway(10° 2s)');
    const output = new OutputExpression(project, evaluate, DefaultLocales);
    expect(output.getNumberProperty('duration')).toBe(2);
    // Its own input is readable too, which is what drives the parameter slider.
    expect(output.getNumberProperty('angle')).toBe(10);
});
