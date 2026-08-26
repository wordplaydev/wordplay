/**
 * What an animation *plays*: the pure mapping from an animation's poses to the
 * music each one strikes, and the rule for when a pose is struck at all.
 *
 * This is the music counterpart of {@link ../Cues/figure.ts}, and pure for the
 * same reason — an animation needs a DOM and vitest runs in node — but it is not
 * a cue. A cue describes what an animation is doing, for a viewer who cannot see
 * it; a pose's music is content the creator wrote, and sounds whether or not any
 * accessibility setting is on.
 *
 * It is also where a `Pose`'s music is finally converted. `Music` value-imports
 * `Pose` for its own inert default pose, so `Pose` cannot import `Music` back
 * without closing a cycle that breaks at class-definition time; `Pose` therefore
 * holds the unconverted value and this module — which nothing in that graph
 * imports — turns it into a `Music`.
 */

import type Project from '@db/projects/Project';
import type Music from '@output/Music/Music';
import { toMusic } from '@output/Music/Music';
import collectOutputs from '@output/Output/collectOutputs';
import type Output from '@output/Output/Output';
import { NameGenerator } from '@output/Output/Stage';
import { AnimationState } from '@output/animation/OutputAnimation';
import Pose from '@output/animation/Pose';
import Sequence from '@output/animation/Sequence';
import type Transition from '@output/animation/Transition';

/** One sounded moment of an animation. */
export type PoseStrike = {
    /** When to sound it, in ms from the start of the animation. */
    atMs: number;
    music: Music;
};

/** The source last struck in each animation state. */
export type Struck = Map<AnimationState, Pose | Sequence | undefined>;

/**
 * The music a pose carries, or nothing.
 *
 * The namer is a throwaway, deliberately not the stage's: the stage's
 * de-duplicates by design, so one `Pose` shared by twenty outputs would get
 * twenty names and stack twenty copies of the same sound. This one is
 * deterministic instead — an explicit `name:` passes through, and an unnamed
 * music is named after the node that made it — so every output striking a pose
 * sounds the one piece, which is the whole of the "one voice per music" rule.
 */
export function musicOf(project: Project, pose: Pose): Music | undefined {
    return pose.music === undefined
        ? undefined
        : toMusic(project, pose.music, new NameGenerator());
}

/** True if the two animation sources are the same one. */
function sameSource(
    a: Pose | Sequence | undefined,
    b: Pose | Sequence | undefined,
): boolean {
    if (a === undefined || b === undefined) return a === b;
    if (a instanceof Pose && b instanceof Pose) return a.equals(b);
    if (a instanceof Sequence && b instanceof Sequence) return a.equals(b);
    return false;
}

/**
 * Whether an animation about to start is a new performance of its poses, or
 * something the output has already sounded.
 *
 * This is the whole answer to "why doesn't it fire continuously", and three
 * paths make that a real question. Output the simulation places goes through
 * `start()` every frame when it carries an authored `moving:`.
 * `Animator.animate()` calls `rest()` on every present output on every stage
 * re-render — a caret move included. And every move ends by returning to rest,
 * so a `resting:` pose is re-offered after each one.
 *
 * The first two are refused by `renewed`, which asks whether a *new* animation
 * is beginning or one still running is being rebuilt — and which is also what
 * lets a looping resting `Sequence` sound each time round, since a loop starts
 * again only once its animation has finished.
 *
 * The third needs the distinction `renewed` can't make, because a finished move
 * looks exactly like a finished loop. A `resting:` pose is a state of *being*
 * rather than an event: an output that moved and came back to rest in the same
 * pose has not struck it again, where each move and each turn of a loop has.
 * That is the one case where nothing but an actual change sounds.
 *
 * Memory is per state, since the states interleave: the mouse in `Catch` is
 * struck at rest, moves, and comes back, and comparing against whatever was
 * struck *last* would hear the move in between and call the return new.
 */
export function shouldStrike(
    struck: Struck,
    state: AnimationState,
    source: Pose | Sequence | undefined,
    /** True when a *new* animation is beginning rather than replacing one that
     *  is still running. */
    renewed: boolean,
): boolean {
    if (!struck.has(state)) return true;
    if (!sameSource(struck.get(state), source)) return true;
    if (state === AnimationState.Rest && source instanceof Pose) return false;
    return renewed;
}

/**
 * The strikes this animation plays, in time order.
 *
 * The two kinds of pose are read from different places on purpose. A state
 * slot's pose is the pose the state *is*, so it sounds when the state begins —
 * and it is read from the source rather than from the transitions, because it
 * doesn't sit at a fixed index in them: `exit()` puts it second, `move()`
 * repeats it, and `rest()` prepends the pose the output was already holding. A
 * `Sequence`'s poses are keyed by the moment they are held, so they are read
 * from the transitions, which are what carry per-step timing once `compile` has
 * folded in `duration` and `count`.
 *
 * Unlike `figureFor`, the first step is *not* skipped: a `0%` pose is a moment
 * the creator keyed, not merely where the animation happens to start.
 */
export function strikesFor(
    project: Project,
    source: Pose | Sequence | undefined,
    transitions: readonly Transition[],
    /** The whole animation's length, with the animation factor already in it. */
    totalMs: number,
    /** Where in the animation to begin sounding. Nonzero only when resuming. */
    fromMs: number,
    /** Whether this animation is a new performance of its poses. */
    fresh: boolean,
): PoseStrike[] {
    if (!fresh) return [];

    const strikes: PoseStrike[] = [];

    if (source instanceof Pose) {
        const music = musicOf(project, source);
        if (music) strikes.push({ atMs: 0, music });
    } else if (source instanceof Sequence) {
        // Transitions carry the time to *reach* each pose, so the clock advances
        // before the strike rather than after it. Every transition spends time,
        // including the lead-in and lead-out, but only a step can sound.
        const factor =
            totalMs /
            Math.max(
                1,
                transitions.reduce(
                    (total, transition) => total + transition.duration,
                    0,
                ),
            );
        let atMs = 0;
        for (const transition of transitions) {
            atMs += transition.duration * factor;
            if (!transition.step) continue;
            const music = musicOf(project, transition.pose);
            if (music) strikes.push({ atMs, music });
        }
    }

    return collapse(strikes.filter((strike) => strike.atMs >= fromMs));
}

/**
 * Fold together strikes of the same music at the same instant. `compile` repeats
 * its transitions to honor `count`, which puts one repetition's last pose and
 * the next one's first at the very same millisecond; sounding that piece twice
 * there is one restart cancelling another, which is audible as a stutter.
 */
export function collapse(strikes: PoseStrike[]): PoseStrike[] {
    const kept: PoseStrike[] = [];
    for (const strike of strikes)
        if (
            !kept.some(
                (other) =>
                    Math.round(other.atMs) === Math.round(strike.atMs) &&
                    other.music.getName() === strike.music.getName(),
            )
        )
            kept.push(strike);
    return kept;
}

/**
 * Every music reachable through an output's four animation states, for the
 * static safety gate — which reads the stage's *content* and so would otherwise
 * never see a sound that only a pose can make.
 */
export function poseMusicOf(project: Project, output: Output): Music[] {
    const music: Music[] = [];
    for (const source of [
        output.entering,
        output.resting,
        output.moving,
        output.exiting,
    ]) {
        if (source instanceof Pose) {
            const one = musicOf(project, source);
            if (one) music.push(one);
        } else if (source instanceof Sequence)
            for (const step of source.poses) {
                const one = musicOf(project, step.pose);
                if (one) music.push(one);
            }
    }
    return music;
}

/**
 * Every music a whole stage can strike.
 *
 * The static safety gate reads `Stage.getMusic()`, which walks *content* — so
 * without this a project whose only sound is a pose's would start with no gate at
 * all. Deliberately not folded into `getMusic()`: anything there is music that is
 * *present*, and would begin playing at once and go on playing.
 */
export function stagePoseMusic(project: Project, root: Output): Music[] {
    return collectOutputs(root).flatMap((output) =>
        poseMusicOf(project, output),
    );
}
