import type TypeOutput from './TypeOutput';
import { PX_PER_METER, sizeToPx, toOutputTransform } from './outputToCSS';
import Place from './Place';
import Pose from './Pose';
import Sequence from './Sequence';
import type Stage from './Stage';
import type { Orientation, OutputName } from './Stage';
import Transition from './Transition';
import Verse from './Verse';
import type RenderContext from './RenderContext';
import Phrase from './Phrase';

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
    output: TypeOutput;

    /** The current context for rendering */
    context: RenderContext;

    /** The cached name of the phrase, just to avoid recomputing. */
    name: OutputName;

    /** The current animation state */
    state: State = State.Rest;

    /** The current Web API Animation playing, so we can cancel it as necessary. */
    animation: Animation | undefined;

    /** The curren transitions animating */
    sequence: Transition[] | undefined = undefined;

    constructor(
        stage: Stage,
        phrase: TypeOutput,
        context: RenderContext,
        entry: boolean
    ) {
        this.stage = stage;
        this.output = phrase;
        this.context = context;
        this.name = phrase.getName();

        this.log(`Initializing animation state`);

        // Is this an entry? Start the entry animation, if there is one.
        if (entry) this.enter();
        // Otherwise, start rendering the still pose, if there is one.
        else this.rest();
    }

    log(message: string) {
        if (Log)
            console.log(
                `${Math.round(Date.now() / 1000)}s (${this.output.getName()}) ${
                    this.output instanceof Phrase
                        ? this.output.text[0].text
                        : this.output.value.creator.toWordplay()
                }: ${message}`
            );
    }

    /** Update the current animation with a new phrase by the same name. */
    update(output: TypeOutput, context: RenderContext, entry: boolean) {
        // Before we update, see if the rest pose changed so we can tween it.
        const prior = this.output;

        // Update the phrase and name.
        this.output = output;
        this.context = context;
        this.name = output.getName();

        this.log(`Updating, entry = ${entry}`);

        // Did this just enter?
        if (entry) {
            // Are we not yet entering? Start the entry animation.
            if (this.state !== State.Entering) this.enter();
            // Otherwise just wait for entry to finish.
        }
        // Otherwise, if we're resting, transition to the new rest state.
        else if (this.state === State.Rest) this.rest(prior);
        // Otherwise, just let the move or exit finish and it will pick up the updates next time.
    }

    /** Change to the still state and start a transition to it. */
    rest(prior?: TypeOutput) {
        this.state = State.Rest;
        // If the rest pose changed to a new pose, or the size changed, animate to it.
        if (
            prior &&
            prior.rest instanceof Pose &&
            this.output.rest instanceof Pose &&
            (!prior.rest.equals(this.output.rest) ||
                prior.size !== this.output.size)
        ) {
            // If there's a prior that's different from the present, transition to the present.
            this.start(State.Rest, [
                // Start at the previous position, no transition
                new Transition(
                    undefined,
                    prior.rotation,
                    prior.size,
                    prior.rest,
                    0,
                    this.output.style
                ),
                // Tansition to the new position with resting pose as a baseline, and move on top
                new Transition(
                    undefined,
                    this.output.rotation,
                    this.output.size,
                    this.output.rest,
                    this.output.duration,
                    this.output.style
                ),
            ]);
        }
        // If the new rest is a sequence, start the sequence.
        else if (this.output.rest instanceof Sequence) {
            const sequence = this.output.rest.compile(
                undefined,
                this.output.rotation,
                undefined,
                this.output.size
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
                            this.output.duration
                        );
                        // Add the first rest pose as the first keyframe.
                        sequence.unshift(
                            new Transition(
                                undefined,
                                prior.rotation,
                                prior.size,
                                priorRestPose,
                                0,
                                this.output.style
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
        const enter = this.output.enter;
        // No entry pose or animation? Start still.
        if (enter === undefined) this.rest();
        // Otherwise, transition to from entry to rest
        else {
            // Get the first pose of still so we can animate to it.
            const firstStillPose =
                this.output.rest instanceof Pose
                    ? this.output.rest
                    : this.output.rest.getFirstPose();
            const entrySequence =
                enter instanceof Pose ? enter : enter.compile();

            const outputInfo = this.stage.scene.get(this.output.getName());

            if (outputInfo === undefined) {
                this.log(`No output info, not entering`);
                return;
            }

            // If the entry transition is a pose, just animate from entry to the still pose.
            const newSequence =
                entrySequence instanceof Pose
                    ? ([
                          new Transition(
                              outputInfo.local,
                              this.output.rotation,
                              this.output.size,
                              entrySequence,
                              0,
                              this.output.style
                          ),
                          new Transition(
                              outputInfo.local,
                              this.output.rotation,
                              this.output.size,
                              // No first pose? I guess we animate to the entry pose.
                              firstStillPose ?? entrySequence,
                              this.output.duration,
                              this.output.style
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
                                        outputInfo.local,
                                        this.output.rotation,
                                        this.output.size,
                                        firstStillPose,
                                        this.output.duration,
                                        this.output.style
                                    ),
                                ]
                              : []),
                      ] satisfies TransitionSequence)
                    : undefined;

            if (newSequence !== undefined)
                this.start(State.Entering, newSequence);
        }
    }

    move(prior: Orientation, present: Orientation) {
        const move = this.output.move;
        const rest =
            this.output.rest instanceof Pose
                ? this.output.rest
                : this.output.rest.getFirstPose();

        this.log(`Moving from ${prior.toString()} to ${present.toString()}`);

        // If there's a pose, tween the prior and new place, posing while we do it, then transition to the still pose.
        // If the rest is an empty sequence, then just use the move pose.
        if (move instanceof Pose)
            this.start(State.Moving, [
                // Start at the previous position, no transition
                new Transition(
                    prior.place,
                    this.output.rotation,
                    this.output.size,
                    rest ? rest.with(move) : move,
                    0,
                    this.output.style
                ),
                // Tansition to the new position with resting pose as a baseline, and move on top
                new Transition(
                    present.place,
                    this.output.rotation,
                    this.output.size,
                    rest ? rest.with(move) : move,
                    this.output.duration / 2,
                    this.output.style
                ),
                // Transition from the move pose to the rest pose.
                new Transition(
                    present.place,
                    this.output.rotation,
                    this.output.size,
                    rest ?? move,
                    this.output.duration / 2,
                    this.output.style
                ),
            ]);
        // If move is a sequence, run it, but account for the resting pose.
        else if (move instanceof Sequence) {
            let transitions = move.compile(undefined, undefined, rest);

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
                    prior.place.value,
                    prior.place.x + (present.place.x - prior.place.x) * percent,
                    prior.place.y + (present.place.y - prior.place.y) * percent,
                    prior.place.z + (present.place.z - prior.place.z) * percent
                );
                return transition
                    .withPlace(interpolatedPlace)
                    .withRotation(
                        (prior.rotation ?? 0) +
                            ((present.rotation ?? 0) - (prior.rotation ?? 0)) *
                                percent
                    );
            }) as TransitionSequence;

            // Start the sequence
            this.start(State.Moving, placed);
        }
    }

    exit() {
        // If there's an exit pose, animate from rest to exit.
        if (this.output.exit instanceof Pose) {
            // Get the first rest pose.
            const rest =
                this.output.rest instanceof Pose
                    ? this.output.rest
                    : this.output.rest.getFirstPose();

            // If the exit is a pose, transition from rest to pose.
            this.start(State.Exiting, [
                // Start at the previous rest position, or if there isn't one, the exit.
                new Transition(
                    undefined,
                    this.output.rotation,
                    this.output.size,
                    rest ?? this.output.exit,
                    0,
                    this.output.style
                ),
                // Tansition to the new position with resting pose as a baseline, and move on top
                new Transition(
                    undefined,
                    this.output.rotation,
                    this.output.size,
                    this.output.exit,
                    this.output.duration,
                    this.output.style
                ),
            ]);
        } else if (this.output.exit instanceof Sequence) {
            const sequence = this.output.exit.compile();
            if (sequence) this.start(State.Exiting, sequence);
            else this.exited();
        }
        // No exit? Mark the animation done and cancel any current animations.
        else this.exited();
    }

    // Must have at least two transitions.
    start(
        state: State,
        transitions: [Transition, Transition, ...Transition[]]
    ) {
        // Don't start any new animations if we're done or already in the state.
        if (this.state === State.Done) return;

        // Don't start any animations if there's no verse.
        if (this.stage.verse === undefined) return;

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

        // Update to the requested state.
        this.state = state;
        this.log(`State => ${this.state}`);

        // Compute the total duration so we can generate offsets for the Web Animation API
        // (and decide whether to animate at all)
        const totalDuration = this.context.animated
            ? transitions.reduce(
                  (total, transition) => total + transition.duration,
                  0
              )
            : 0;

        // No duration? End immediately (unless resting, since
        // that would cause an infinite loop).
        if (totalDuration <= 0) {
            if (this.state !== State.Rest) this.finish();
            return;
        }

        // Use the sequence to create an animation with the Web Animation API.

        // Find the element corresponding to the phrase in the given verse.
        const element = document.querySelector(
            `.verse.live [data-id="${this.stage.verse.getHTMLID()}"] [data-id="${this.output.getHTMLID()}"]`
        );

        // If there's DOM element and this isn't exiting, start an animation.
        // (We have to defer for exits because the output needs to render the new exiting output first.)
        if (!(element instanceof HTMLElement)) {
            this.log(`No HTML element, ending animation`);
            this.exited();
            return;
        }

        // Get the info for the output.
        const info = this.stage.scene.get(this.output.getName());

        if (info === undefined) {
            this.log(`No output info, ending animation.`);
            this.exited();
            return;
        }

        // Compute the focus place in this phrase's parent coordinate system.
        const parents = info.parents;
        let offsetFocus: Place | undefined = this.stage.focus;
        if (parents && offsetFocus) {
            for (const parent of parents) {
                if (!(parent instanceof Verse)) {
                    const parentInfo = this.stage.scene.get(parent.getName());
                    const parentPlace = parentInfo?.local;
                    if (parentPlace)
                        offsetFocus = offsetFocus.offset(parentPlace);
                    else {
                        offsetFocus = undefined;
                        break;
                    }
                }
            }
        } else {
            offsetFocus = undefined;
        }

        if (offsetFocus === undefined) {
            this.log(`Missing parent output info, ignoring animating.`);
            return;
        }

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
            const localPlace = transition.place ?? info.local;

            // Convert the rest to a transform that respects the rendering rules.
            // All of this logic should mirror what GroupView and PhraseView do.
            if (localPlace && offsetFocus) {
                const layout = this.output.getLayout(this.context);

                keyframe.transform = toOutputTransform(
                    transition.pose,
                    localPlace,
                    transition.rotation,
                    offsetFocus,
                    // Anything rooted in the verse has no height.
                    // Otherwise, pass the height of the parent, just like
                    // we do in GroupView.
                    this.state === State.Exiting || parents[0] instanceof Verse
                        ? 0
                        : parents[0].getLayout(this.context).height,
                    {
                        width: layout.width * PX_PER_METER,
                        ascent: layout.height * PX_PER_METER,
                    }
                );
            }

            // What size should we transition to? Set if specified by the transition.
            if (transition.size !== undefined)
                keyframe.fontSize = sizeToPx(transition.size);

            // Eep, side effect in a higher order function!
            currentOffset += transition.duration / totalDuration;

            keyframe.offset = Math.max(0, Math.min(1, currentOffset));
            keyframe.easing = styleToCSSEasing(transition.style);

            return keyframe;
        });

        this.log(`Starting ${totalDuration}s ${this.state} animation...`);

        // Remember the sequence we're animating so we can highlight elsewhere in the UI.
        this.sequence = transitions;

        // Notify the stage that we're starting the sequence.
        this.stage.startingSequence(transitions);

        // Start the Web Animation API animation...
        this.animation?.cancel();
        this.animation = element.animate(keyframes, {
            // Wordplay durations are seconds
            duration: totalDuration * 1000,
        });

        // When the animation is done, update the animation state.
        this.animation.onfinish = () => this.finish();
    }

    finish() {
        this.log(`Finished; determining next state`);

        // If there's a sequence animating, notify the stage we're ending it.
        if (this.sequence) this.stage.endingSequence(this.sequence);

        // Reset the current sequence.
        this.sequence = undefined;
        // Did entering, still, or move finish? Do rest again.
        if (
            this.state === State.Entering ||
            this.state === State.Rest ||
            this.state === State.Moving
        )
            this.rest();
        // Did it finish exiting? Done.
        else if (this.state === State.Exiting) this.exited();
    }

    exited() {
        this.log(`Exiting`);

        // If there's a sequence animating, notify the stage we're ending it.
        if (this.sequence) this.stage.endingSequence(this.sequence);

        // Permananently mark the state as done.
        this.state = State.Done;

        // Cancel any current animations.
        this.animation?.cancel();

        // Notify the stage this ended.
        this.stage.exited(this);
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
