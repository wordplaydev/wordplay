import type Project from '#db/projects/Project.ts';
import type Node from '#nodes/Node.ts';
import type Output from '#output/Output/Output.ts';
import { getInputExpression } from '#output/Output/sourceExpression.ts';
import type Valued from '#output/Output/Valued.ts';
import type Transition from '#output/animation/Transition.ts';

/**
 * The nodes a running tween should highlight: the expression that built each
 * pose, falling back to the animation's own call site when that expression is
 * something the creator can't see (see {@link getInputExpression}).
 * Deduplicated, since a sequence repeats poses.
 */
export function getAnimatingNodes(
    project: Project,
    output: Output,
    animation: Valued | undefined,
    transitions: Transition[],
): Node[] {
    // Resolved at most once, since the fallback walks the output's inputs.
    let fallback: Node | undefined | null = null;
    const nodes: Node[] = [];
    for (const transition of transitions) {
        const creator = transition.pose.value.creator;
        let node: Node | undefined;
        if (project.contains(creator)) node = creator;
        else {
            if (fallback === null)
                fallback = getInputExpression(
                    project,
                    output.value,
                    animation?.value,
                );
            node = fallback;
        }
        if (node !== undefined && !nodes.includes(node)) nodes.push(node);
    }
    return nodes;
}
