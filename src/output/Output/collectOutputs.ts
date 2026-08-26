import type Output from '@output/Output/Output';

/**
 * Every output in a tree, root first.
 *
 * Iterative DFS rather than recursion, and over `getOutput()` rather than
 * `Stage.find`, which is shallow. Shared by the static analyses that must see a
 * whole stage — photosensitivity and music safety — rather than only what a
 * stage lists as its content.
 */
export default function collectOutputs(root: Output): Output[] {
    const all: Output[] = [];
    const stack: Output[] = [root];
    while (stack.length > 0) {
        const output = stack.pop();
        if (output === undefined) continue;
        all.push(output);
        for (const child of output.getOutput())
            if (child !== null) stack.push(child);
    }
    return all;
}
