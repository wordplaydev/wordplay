<script lang="ts">
    /**
     * Sounds a short earcon each time the program re-evaluates, naming the
     * stream that caused it (#537) — what the editor's visual "pop" on a
     * reacting reference says to someone who can see it.
     *
     * It also sounds two things that are not re-evaluations at all: the stage's
     * physics contacts, since a program that never evaluates `Collision()` would
     * otherwise bounce in silence; and its animations, since a looping
     * `Sequence` drives a Web Animation and never touches the program again.
     *
     * Mounted only by ProjectView: cues belong to a creator watching their own
     * program evaluate, not to the autoplaying examples PlayView renders on the
     * landing page and in the tutorial.
     */
    import { getEvaluation } from '@components/project/Contexts';
    import sound, {
        soundFigure,
        type FigureHandle,
    } from '@output/Cues/cueAudio';
    import { onAnimations, type AnimationEvent } from '@output/Cues/animations';
    import { onContacts } from '@output/Cues/contacts';
    import { figureFor, fingerprintOf } from '@output/Cues/figure';
    import CueScheduler, { type CueEvent } from '@output/Cues/cues';
    import type Evaluator from '@runtime/Evaluator';
    import type { StreamChange } from '@runtime/Evaluator';

    let evaluation = getEvaluation();

    const scheduler = new CueScheduler();

    /** Reset with the evaluator, which a revision replaces. */
    let evaluator: Evaluator | undefined = undefined;
    /** The last reaction cued while playing. */
    let played = -1;
    /** The reaction the caret was in when we last cued while stepping, so
     *  stepping within one input stays silent and crossing into another cues. */
    let stepped: StreamChange | undefined = undefined;

    /** A reaction with no changes is the start of an evaluation; otherwise it is
     *  the streams that caused it, one cue each however many streams share a kind.
     *
     *  Collisions are the exception: the contact itself is already cued, and the
     *  reaction is only its consequence, so cueing both would sound one bounce
     *  twice. */
    function eventsOf(reaction: StreamChange): CueEvent[] {
        const kinds = reaction.changes
            .filter((change) => change.stream !== undefined)
            .map((change) => change.stream.kind)
            .filter((kind) => kind !== 'collision');
        return reaction.changes.length === 0 ? ['start'] : [...new Set(kinds)];
    }

    function cue(source: Evaluator, reaction: StreamChange) {
        sound(
            scheduler.reaction(source, reaction.stepIndex, eventsOf(reaction)),
        );
    }

    // Whose contacts to sound: the playing project's evaluator, or none.
    // Derived rather than read inside the effect below, because the evaluation
    // store broadcasts every frame while playing and the value here changes
    // only on a revision — so the subscription is made once rather than torn
    // down and rebuilt sixty times a second.
    let contacting = $derived(
        $evaluation?.mode === 'play' ? $evaluation.evaluator : undefined,
    );

    // Physics contacts, which happen whether or not the program is watching for
    // them. Only while playing — physics doesn't tick while paused, so edit and
    // debug are silent without a gate of their own.
    $effect(() => {
        const target = contacting;
        if (target === undefined) return;
        return onContacts(target, (contacts) =>
            sound(scheduler.contacts(contacts)),
        );
    });

    // Animations, whose figures are scheduled a whole iteration ahead: what each
    // output has pending, so a new figure or a cancel can take it back.
    let figures = new Map<string, FigureHandle>();
    // What each output's last figure was, so coming round again can be heard as
    // coming round again rather than as a new figure that happens to match.
    let figured = new Map<string, string>();

    function stopFigure(name: string) {
        figures.get(name)?.cancel();
        figures.delete(name);
    }

    function startFigure(event: AnimationEvent) {
        stopFigure(event.name);
        const fingerprint = fingerprintOf(event);
        const repeat = figured.get(event.name) === fingerprint;
        figured.set(event.name, fingerprint);
        const figure = figureFor(event, repeat);
        if (figure.length > 0) figures.set(event.name, soundFigure(figure));
    }

    $effect(() => {
        const target = contacting;
        if (target === undefined) return;
        const stop = onAnimations(target, {
            started: startFigure,
            stopped: stopFigure,
        });
        return () => {
            stop();
            for (const handle of figures.values()) handle.cancel();
            figures = new Map();
            figured = new Map();
        };
    });

    $effect(() => {
        const state = $evaluation;
        if (state === undefined) return;

        // A revision builds a new evaluator, and its history is a new history.
        if (state.evaluator !== evaluator) {
            evaluator = state.evaluator;
            played = -1;
            stepped = undefined;
        }

        // Playing: cue every reaction that has happened since the last one we
        // heard, since several can land between two broadcasts.
        if (state.mode === 'play' && state.playing) {
            const fresh = [];
            for (let index = state.streams.length - 1; index >= 0; index--) {
                const reaction = state.streams[index];
                if (reaction.stepIndex <= played) break;
                fresh.unshift(reaction);
            }
            for (const reaction of fresh) cue(state.evaluator, reaction);
            played =
                state.streams[state.streams.length - 1]?.stepIndex ?? played;
        }
        // Stepping: cue whichever input the current step has landed in, however
        // it got there — a step, a jump to the next input, or a slider drag.
        // Direction isn't distinguished: the cue says where you are now, which
        // is what the timeline highlights.
        else if (state.mode === 'debug') {
            const current = state.evaluator.getReactionPriorTo(state.stepIndex);
            if (current !== undefined && current !== stepped) {
                stepped = current;
                cue(state.evaluator, current);
            }
        }
    });
</script>
