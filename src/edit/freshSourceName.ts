import type Project from '@db/projects/Project';
import Bind from '@nodes/Bind';

/**
 * A name for a new source file that nothing in the project is already using.
 *
 * Three things compete for one space. Source names and bind names share it:
 * `Project.getShare` matches a **source** name before it looks at shares, so an
 * imported source called `song` would shadow a bind of that name. And the basis
 * shares it too — a source called `Color` shadows the very type it holds, which
 * is how a picture's source file broke every `Color(…)` in the program that
 * borrowed it. Numbered onward from whatever is taken, so importing twice gives
 * `song` and then `song2`.
 */
export default function freshSourceName(
    project: Project,
    wanted: string,
): string {
    const taken = new Set<string>();
    for (const share of project.shares.all)
        for (const name of share.names.getNames()) taken.add(name);
    for (const each of project.getSources()) {
        for (const name of each.names.getNames()) taken.add(name);
        for (const node of each.nodes())
            if (node instanceof Bind)
                for (const name of node.names.getNames()) taken.add(name);
    }
    if (!taken.has(wanted)) return wanted;
    let n = 2;
    while (taken.has(`${wanted}${n}`)) n++;
    return `${wanted}${n}`;
}
