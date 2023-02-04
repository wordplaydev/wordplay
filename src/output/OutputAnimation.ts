import { sizeToPx, toOutputTransform } from './outputToCSS';
import type Phrase from './Phrase';
import Place from './Place';
import Pose from './Pose';
import Sequence from './Sequence';
import type Stage from './Stage';
import type { OutputName } from './Stage';
import Transition from './Transition';

enum State {
    Entering = 'entering',
    Rest = 'rest',
    Moving = 'moving',
    Exiting = 'exiting',
    Done = 'done',
}

export type TransitionSequence = [Transition, Transition, ...Transition[]];

const Log = false;

/**
 * Responsible for tracking the current rendered appearance of some output
 * and its animation state.
 */
export default class OutputAnimation {
    /** The animator that created this */
    stage: Stage;

    /** The current phrase for this name */
    phrase: Phrase;

    /** The cached name of the phrase, just to avoid recomputing. */
    name: OutputName;

    /** The current animation state */
    state: State = State.Rest;

    /** The current Web API Animation playing, so we can cancel it as necessary. */
    animation: Animation | undefined;

    /** The curren transitions animating */
    sequence: Transition[] | undefined = undefined;

    constructor(stage: Stage, phrase: Phrase, entry: boolean) {
        this.stage = stage;
        this.phrase = phrase;
        this.name = phrase.getName();

        OutputAnimation.log(
            `Initializing '${this.phrase.text[0].text}', entry = ${entry}`
        );

        // Is this an entry? Start the entry animation, if there is one.
        if (entry) this.enter();
        // Otherwise, start rendering the still pose, if there is one.
        else this.rest();
    }

    static log(message: any) {
        if (Log) console.log(message);
    }

    /** Update the current animation with a new phrase by the same name. */
    update(phrase: Phrase, entry: boolean) {
        // Before we update, see if the rest pose changed so we can tween it.
        const prior = this.phrase;

        // Update the phrase and name.
        this.phrase = phrase;
        this.name = phrase.getName();

        OutputAnimation.log(
            `Updating '${this.phrase.text[0].text}', entry = ${entry}`
        );

        // Did this just enter, or are we currently entering? Go to the enter state.
        if (entry || this.state === State.Entering) this.enter();
        // Otherwise, if we're resting, transition to the new rest state.
        else if (this.state === State.Rest) this.rest(prior);
        // Otherwise, just let the move or exit finish and we'll use the new poses next time.
    }

    /** Change to the still state and start a transition to it. */
    rest(prior?: Phrase) {
        this.state = State.Rest;
        // If the rest pose changed to a new pose, or the size changed, animate to it.
        if (
            prior &&
            prior.rest instanceof Pose &&
            this.phrase.rest instanceof Pose &&
            (!prior.rest.equals(this.phrase.rest) ||
                prior.size !== this.phrase.size)
        ) {
            // If there's a prior that's different from the present, transition to the present.
            this.start(State.Rest, [
                // Start at the previous position, no transition
                new Transition(
                    undefined,
                    prior.size,
                    prior.rest,
                    0,
                    this.phrase.style
                ),
                // Tansition to the new position with resting pose as a baseline, and move on top
                new Transition(
                    undefined,
                    this.phrase.size,
                    this.phrase.rest,
                    this.phrase.duration,
                    this.phrase.style
                ),
            ]);
        }
        // If the new rest is a sequence, start the sequence.
        else if (this.phrase.rest instanceof Sequence) {
            const sequence = this.phrase.rest.compile(
                undefined,
                undefined,
                this.phrase.size
            );
            // If it wasn't empty, prepend a starting state with the original size and pose.
            if (sequence) {
                if (prior) {
                    const priorRestPose =
                        prior.rest instanceof Pose
                            ? prior.rest
                            : prior.rest.getFirstPose();
                    if (priorRestPose) {
                        // Update the first keyframe's duration, so there's a transition from the first rest pose.
                        sequence[0] = sequence[0].withDuration(
                            this.phrase.duration
                        );
                        // Add the first rest pose as the first keyframe.
                        sequence.unshift(
                            new Transition(
                                undefined,
                                prior.size,
                                priorRestPose,
                                0,
                                this.phrase.style
                            )
                        );
                    }
                }
                this.start(State.Rest, sequence);
            }
        }
    }

    /** Change to the entering state.  */
    enter() {
        const enter = this.phrase.enter;
        // No entry pose or animation? Start still.
        if (enter === undefined) this.rest();
        // Otherwise, transition to from entry to rest
        else {
            // Get the first pose of still so we can animate to it.
            const firstStillPose =
                this.phrase.rest instanceof Pose
                    ? this.phrase.rest
                    : this.phrase.rest.getFirstPose();
            const entrySequence =
                enter instanceof Pose ? enter : enter.compile();

            // If the entry transition is a pose, just animate from entry to the still pose.
            const newSequence =
                entrySequence instanceof Pose
                    ? ([
                          new Transition(
                              this.stage.places.get(this.phrase),
                              this.phrase.size,
                              entrySequence,
                              0,
                              this.phrase.style
                          ),
                          new Transition(
                              this.stage.places.get(this.phrase),
                              this.phrase.size,
                              // No first pose? I guess we animate to the entry pose.
                              firstStillPose ?? entrySequence,
                              this.phrase.duration,
                              this.phrase.style
                          ),
                      ] satisfies TransitionSequence)
                    : // If the entry transition is a sequence, animate the sequence, then transition to the first still pose.
                    entrySequence !== undefined
                    ? ([
                          ...entrySequence,
                          // No first pose because of an empty sequence? Just do the entry sequence.
                          ...(firstStillPose
                              ? [
                                    new Transition(
                                        this.stage.places.get(this.phrase),
                                        this.phrase.size,
                                        firstStillPose,
                                        this.phrase.duration,
                                        this.phrase.style
                                    ),
                                ]
                              : []),
                      ] satisfies TransitionSequence)
                    : undefined;

            if (newSequence !== undefined)
                this.start(State.Entering, newSequence);
        }
    }

    move(prior: Place, present: Place) {
        const move = this.phrase.move;
        const rest =
            this.phrase.rest instanceof Pose
                ? this.phrase.rest
                : this.phrase.rest.getFirstPose();

        OutputAnimation.log(`From ${prior} to ${present}`);
        // If there's a pose, tween the prior and new place, posing while we do it, then transition to the still pose.
        // If the rest is an empty sequence, then just use the move pose.
        if (move instanceof Pose)
            this.start(State.Moving, [
                // Start at the previous position, no transition
                new Transition(
                    prior,
                    this.phrase.size,
                    rest ? rest.with(move) : move,
                    0,
                    this.phrase.style
                ),
                // Tansition to the new position with resting pose as a baseline, and move on top
                new Transition(
                    present,
                    this.phrase.size,
                    rest ? rest.with(move) : move,
                    this.phrase.duration / 2,
                    this.phrase.style
                ),
                // Transition from the move pose to the rest pose.
                new Transition(
                    present,
                    this.phrase.size,
                    rest ?? move,
                    this.phrase.duration / 2,
                    this.phrase.style
                ),
            ]);
        // If move is a sequence, run it, but account for the resting pose.
        else if (move instanceof Sequence) {
            let transitions = move.compile(undefined, rest);

            if (transitions === undefined) return;

            // Add an interpolated place to all of the transitions
            // ensuring a smooth move from one place to the next.
            const totalDuration = transitions.reduce(
                (total, transition) => total + transition.duration,
                0
            );
            let currentDuration = 0;
            const placed = transitions.map((transition) => {
                currentDuration += transition.duration;
                const percent = currentDuration / totalDuration;
                const interpolatedPlace = new Place(
                    prior.value,
                    prior.x.add(present.x.sub(prior.x).times(percent)),
                    prior.y.add(present.y.sub(prior.y).times(percent)),
                    prior.z.add(present.z.sub(prior.z).times(percent)),
                    prior.rotation.add(
                        present.rotation.sub(prior.rotation).times(percent)
                    )
                );
                return transition.withPlace(interpolatedPlace);
            }) as TransitionSequence;

            // Start the sequence
            this.start(State.Moving, placed);
        }
    }

    exit() {
        // If there's an exit pose, animate from rest to exit.
        if (this.phrase.exit instanceof Pose) {
            // Get the first rest pose.
            const rest =
                this.phrase.rest instanceof Pose
                    ? this.phrase.rest
                    : this.phrase.rest.getFirstPose();

            // If the exit is a pose, transition from rest to pose.
            this.start(State.Exiting, [
                // Start at the previous rest position, or if there isn't one, the exit.
                new Transition(
                    undefined,
                    this.phrase.size,
                    rest ?? this.phrase.exit,
                    0,
                    this.phrase.style
                ),
                // Tansition to the new position with resting pose as a baseline, and move on top
                new Transition(
                    undefined,
                    this.phrase.size,
                    this.phrase.exit,
                    this.phrase.duration,
                    this.phrase.style
                ),
            ]);
        } else if (this.phrase.exit instanceof Sequence) {
            const sequence = this.phrase.exit.compile();
            if (sequence) this.start(State.Exiting, sequence);
            else this.end();
        }
        // No exit? Mark the animation done and cancel any current animations.
        else this.end();
    }

    // Must have at least two transitions.
    start(
        state: State,
        transitions: [Transition, Transition, ...Transition[]]
    ) {
        // Don't start any new animations if we're done.
        if (this.state === State.Done) return;

        // Update to the requested state.
        this.state = state;
        OutputAnimation.log(`${this.phrase.text[0].text} => ${this.state}`);

        // Cancel any current animation.
        if (this.animation) {
            this.animation.onfinish = null;
            this.animation.cancel();
        }

        // End any current sequence first.
        if (this.sequence) {
            this.stage.endingSequence(this.sequence);
            this.sequence = undefined;
        }

        // Compute the total duration so we can generate offsets for the Web Animation API
        // (and decide whether to animate at all)
        const totalDuration = transitions.reduce(
            (total, transition) => total + transition.duration,
            0
        );

        // No duration? End immediately.
        if (totalDuration <= 0) {
            this.finish();
            return;
        }

        // Use the sequence to create an animation with the Web Animation API.
        const verse = this.stage.getElement();
        // Find the element corresponding to the phrase.
        const element = verse?.querySelector(
            `[data-id="${this.phrase.getHTMLID()}"]`
        );
        // If there's DOM element and this isn't exiting, start an animation.
        // (We have to defer for exits because the output needs to render the new exiting output first.)
        if (element instanceof HTMLElement) {
            // Convert the transitions to WebAnimation API keyframes.
            let currentOffset = 0;
            const keyframes = transitions.map((transition) => {
                const keyframe: Keyframe = {};

                if (transition.pose.color !== undefined)
                    keyframe.color = transition.pose.color.toCSS();
                if (transition.pose.opacity !== undefined)
                    keyframe.opacity = transition.pose.opacity;

                // Where should we position this? Use the transition's place if it
                // specifies one and the current place if not.
                const place =
                    transition.place ?? this.stage.places.get(this.phrase);

                // Convert the rest to a transform that respects the rendering rules.
                if (place)
                    keyframe.transform = toOutputTransform(
                        transition.pose,
                        place,
                        this.stage.focus,
                        this.stage.viewportWidth,
                        this.stage.viewportHeight,
                        this.phrase.getMetrics(this.stage.getRenderContext())
                    );

                // What size should we transition to? Set if specified by the transition.
                if (transition.size !== undefined)
                    keyframe.fontSize = sizeToPx(transition.size);

                // Eep, side effect in a higher order function!
                currentOffset += transition.duration / totalDuration;

                keyframe.offset = Math.max(0, Math.min(1, currentOffset));
                keyframe.easing = styleToCSSEasing(transition.style);

                return keyframe;
            });

            OutputAnimation.log(
                `Starting ${totalDuration}s ${this.state} animation...`
            );
            OutputAnimation.log(keyframes);

            // Remember the sequence we're animating so we can highlight elsewhere in the UI.
            this.sequence = transitions;

            // Notify the stage that we're starting the sequence.
            this.stage.startingSequence(transitions);

            // Start the Web Animation API animation...
            this.animation = element.animate(keyframes, {
                // Wordplay durations are seconds
                duration: totalDuration * 1000,
            });

            // When the animation is done, update the animation state.
            this.animation.onfinish = () => this.finish();
        }
        // Otherwise, ask for this transition in the next frame, after the DOM element has arrived.
        else {
            window.requestAnimationFrame(() => {
                if (this.state !== State.Done) this.start(state, transitions);
            });
        }
    }

    finish() {
        // If there's a sequence animating, notify the stage we're ending it.
        if (this.sequence) this.stage.endingSequence(this.sequence);

        // Reset the current sequence.
        this.sequence = undefined;
        // Did entering, still, or move finish? Do still again.
        if (
            this.state === State.Entering ||
            this.state === State.Rest ||
            this.state === State.Moving
        )
            this.rest();
        // Did it finish exiting? Done.
        else if (this.state === State.Exiting) this.end();
    }

    end() {
        // If there's a sequence animating, notify the stage we're ending it.
        if (this.sequence) this.stage.endingSequence(this.sequence);

        // Permananently mark the state as done.
        this.state = State.Done;

        // Cancel any current animations.
        this.animation?.cancel();

        // Notify the stage this ended.
        this.stage.ended(this);
    }

    /** Done if finished exiting or still and there's no move or exit.  */
    done() {
        return this.state === State.Done;
    }
}

function styleToCSSEasing(name: string | undefined) {
    return name === undefined
        ? 'ease-out'
        : {
              straight: 'linear',
              pokey: 'ease-in',
              cautious: 'ease-in-out',
              zippy: 'ease-out',
          }[name] ?? 'ease-out';
}
