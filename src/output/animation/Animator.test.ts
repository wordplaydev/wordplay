import { DB } from '@db/Database';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import type Node from '@nodes/Node';
import Source from '@nodes/Source';
import Animator from '@output/animation/Animator';
import Evaluator from '@runtime/Evaluator';
import { expect, test } from 'vitest';

/**
 * The animator tracks which nodes are animating so the editor can highlight
 * them. Several outputs can report the same node — one `Phrase(…)` inside a
 * `translate` makes many outputs from one Evaluate, and they all resolve to the
 * same call site — so the report is counted rather than a plain set.
 */
function animatorOver(code: string) {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    project.analyze();
    const evaluator = new Evaluator(
        project,
        DB,
        DefaultLocales.getLocales(),
        false,
    );
    evaluator.getInitialValue();
    /** How many nodes each tick reported. */
    const ticks: number[] = [];
    const animator = new Animator(
        evaluator,
        () => {},
        (nodes) => ticks.push(nodes.size),
    );
    return {
        animator,
        ticks,
        nodes: source.expression.nodes(),
        done() {
            animator.stop();
            evaluator.stop();
        },
    };
}

test('a node stays animating until the last output animating it stops', () => {
    const { animator, nodes, done } = animatorOver(`Phrase('hi')`);
    const shared: Node = nodes[0];
    // Three outputs built by one expression, all reporting it.
    animator.startingSequence([shared]);
    animator.startingSequence([shared]);
    animator.startingSequence([shared]);
    expect(animator.animatingNodes.has(shared)).toBe(true);
    // Two of them finish; the third is still animating, so the highlight holds.
    animator.endingSequence([shared]);
    animator.endingSequence([shared]);
    expect(animator.animatingNodes.has(shared)).toBe(true);
    animator.endingSequence([shared]);
    expect(animator.animatingNodes.has(shared)).toBe(false);
    done();
});

test('the animating nodes are published only when they change', () => {
    const { animator, ticks, nodes, done } = animatorOver(`Phrase('hi')`);
    const [first, second] = nodes;
    animator.startingSequence([first]);
    // Same node again: the set is unchanged, so nothing is republished. Each
    // publish re-runs the editor's whole highlight pass.
    animator.startingSequence([first]);
    animator.endingSequence([first]);
    expect(ticks).toEqual([1]);
    // A different node does change it.
    animator.startingSequence([second]);
    expect(ticks).toEqual([1, 2]);
    done();
});

test('ending a sequence never reported is not counted', () => {
    // A tween that holds still is never announced, so its end must not take a
    // node away from something else that is genuinely animating.
    const { animator, nodes, done } = animatorOver(`Phrase('hi')`);
    const [node] = nodes;
    animator.startingSequence([node]);
    animator.endingSequence([node]);
    animator.endingSequence([node]);
    expect(animator.animatingNodes.size).toBe(0);
    // And a later start still works rather than sitting at a negative count.
    animator.startingSequence([node]);
    expect(animator.animatingNodes.has(node)).toBe(true);
    done();
});
