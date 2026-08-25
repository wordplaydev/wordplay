import { DB } from '@db/Database';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import Evaluate from '@nodes/Evaluate';
import Source from '@nodes/Source';
import type Output from '@output/Output/Output';
import { toStage } from '@output/Output/Stage';
import Sequence from '@output/animation/Sequence';
import { getAnimatingNodes } from '@output/animation/animatingNodes';
import Evaluator from '@runtime/Evaluator';
import { expect, test } from 'vitest';

/**
 * The editor highlights animating code by the node that built each pose, which
 * only works when the creator wrote the poses. A predefined animation builds
 * them inside a function body that `toStructure` parsed, so those nodes belong
 * to no Source and the highlight silently vanished (#543); the call site stands
 * in for them. Resolution needs a real evaluation, so it's tested here rather
 * than through the animator, which needs a DOM.
 */
function restingNodesOf(code: string) {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    project.analyze();
    const evaluator = new Evaluator(
        project,
        DB,
        DefaultLocales.getLocales(),
        false,
    );
    const value = evaluator.getInitialValue();
    if (value === undefined) throw new Error('expected a value');
    const stage = toStage(evaluator, value);
    if (stage === undefined) throw new Error('expected a stage');
    const output: Output | undefined = stage.content[0] ?? undefined;
    if (output === undefined) throw new Error('expected output on stage');

    const resting = output.resting;
    if (!(resting instanceof Sequence))
        throw new Error('expected a resting sequence');
    const transitions = resting.compile();
    if (transitions === undefined)
        throw new Error('expected the sequence to compile');

    const nodes = getAnimatingNodes(project, output, resting, transitions);
    evaluator.stop();
    return { project, source, nodes };
}

test('a predefined animation highlights its call site', () => {
    const { source, nodes } = restingNodesOf(
        `Phrase('hi' resting: Sequence.sway(10°))`,
    );
    // One node — the sway() call — rather than the several generated Pose
    // evaluates inside the basis body, none of which the creator can see.
    expect(nodes).toHaveLength(1);
    expect(source.has(nodes[0])).toBe(true);
    expect(nodes[0]).toBeInstanceOf(Evaluate);
    expect(nodes[0].toWordplay().trim()).toBe('Sequence.sway(10°)');
});

test('a sequence written in the source still highlights its own poses', () => {
    const { source, nodes } = restingNodesOf(
        `Phrase('hi' resting: Sequence({0%: Pose(opacity: 0%) 100%: Pose(opacity: 100%)}))`,
    );
    expect(nodes).toHaveLength(2);
    for (const node of nodes) expect(source.has(node)).toBe(true);
    expect(nodes.map((node) => node.toWordplay().trim())).toEqual([
        'Pose(opacity:0%)',
        'Pose(opacity:100%)',
    ]);
});

test('an animation bound through a name highlights the name that carried it', () => {
    // The poses are still generated, so the fallback resolves to whatever the
    // Phrase's `resting:` input actually is — here a reference, not a call.
    const { source, nodes } = restingNodesOf(
        `swaying: Sequence.sway(10°)\nPhrase('hi' resting: swaying)`,
    );
    expect(nodes).toHaveLength(1);
    expect(source.has(nodes[0])).toBe(true);
    expect(nodes[0].toWordplay().trim()).toBe('swaying');
});

test('a phrase built inside a function highlights the call in that function', () => {
    // The Phrase's own Evaluate is in the source even though it isn't at the
    // top level, so the fallback still reaches something the creator wrote.
    const { source, nodes } = restingNodesOf(
        `ƒ make() Phrase('hi' resting: Sequence.sway(10°))\nmake()`,
    );
    expect(nodes).toHaveLength(1);
    expect(source.has(nodes[0])).toBe(true);
    expect(nodes[0].toWordplay().trim()).toBe('Sequence.sway(10°)');
});
