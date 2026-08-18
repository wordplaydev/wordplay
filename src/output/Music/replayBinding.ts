import type Project from '@db/projects/Project';
import Evaluate from '@nodes/Evaluate';

/** `replay`'s position in Music's inputs; see the structure in Music.ts. */
const ReplayInputIndex = 5;

/**
 * Whether this project ever hands a `Music` a `replay`, read from its source
 * rather than from a running evaluation.
 *
 * This is a cost gate, not a correctness one. Recovering the evaluations a frame
 * missed costs a stage rebuild each, and only a project that uses `replay` can
 * ever need them — so a project that never writes it (which is nearly all of
 * them, including every one that only loops a soundtrack) pays nothing at all.
 * That matters most for projects with music and a stream that evaluates
 * immediately: Lyrics drives 41 tracks from @Beat, and every beat is its own
 * evaluation.
 *
 * It over-approximates on purpose. Reading references finds a `replay` written in
 * a branch that never runs, or in a function never called, and counts it — a
 * false positive costs one rebuild that turns out to be unnecessary, while a
 * false negative costs a sound the creator asked for. Anything it cannot see (a
 * `Music` value built elsewhere and passed in) should be resolved the same way.
 */
export default function projectReplaysMusic(project: Project): boolean {
    const MusicType = project.shares.output.Music;
    const replay = MusicType.inputs[ReplayInputIndex];
    if (replay === undefined) return false;

    const context = project.getContext(project.getMain());
    for (const reference of project.getReferences(MusicType)) {
        // A reference to Music is the function of an Evaluate when it's a call;
        // anything else (a type annotation, a doc link) can't carry an input.
        const parent = project.getRoot(reference)?.getParent(reference);
        if (
            parent instanceof Evaluate &&
            parent.getInput(replay, context) !== undefined
        )
            return true;
    }
    return false;
}
