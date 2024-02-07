import type Output from './Output';
import { PX_PER_METER, sizeToPx, toOutputTransform } from './outputToCSS';
import Place from './Place';
import Pose from './Pose';
import Sequence from './Sequence';
import type Animator from './Animator';
import type { Orientation, OutputName } from './Animator';
import Transition from './Transition';
import Stage from './Stage';
import type RenderContext from './RenderContext';
import Phrase from './Phrase';
import type Locale from '../locale/Locale';
import type Locales from '../locale/Locales';

export enum AnimationState {
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
    animator: Animator;

    /** The current phrase for this name */
    output: Output;

    /** The current context for rendering */
    context: RenderContext;

    /** The cached name of the phrase, just to avoid recomputing. */
    name: OutputName;

    /** The current animation state */
    state: AnimationState = AnimationState.Rest;

    /** The current Web API Animation playing, so we can cancel it as necessary. */
    animation: Animation | undefined;

    /** The curren transitions animating */
    sequence: Transition[] | undefined = undefined;

    constructor(
        scene: Animator,
        phrase: Output,
        context: RenderContext,
        entry: boolean,
    ) {
        this.animator = scene;
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
                `${Math.round(Date.now() / 1000)}s (${this.output.getName()} ${
                    this.state
                }) ${
                    this.output instanceof Phrase
                        ? this.output.text.toString()
                        : this.output.value.creator.toWordplay()
                }: ${message}`,
            );
    }

    /** Update the current animation with a new phrase by the same name. */
    update(output: Output, context: RenderContext, entry: boolean) {
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
            if (this.state !== AnimationState.Entering) this.enter();
            // Otherwise just wait for entry to finish.
        }
        // Otherwise, if we're resting, transition to the new rest state.
        else if (this.state === AnimationState.Rest) this.rest(prior);
        // Otherwise, just let the move or exit finish and it will pick up the updates next time.
    }

    /** Change to the still state and start a transition to it. */
    rest(prior?: Output) {
        this.log('Changing state of ' + this.name + ' to rest');

        this.state = AnimationState.Rest;
        const priorPose = prior?.getRestOrDefaultPose();
        const currentPose = this.output.getRestOrDefaultPose();
        // If the rest pose changed to a new pose, or the size changed, animate to it.
        if (
            prior &&
            priorPose instanceof Pose &&
            currentPose instanceof Pose &&
            (!priorPose.equals(currentPose) || prior.size !== this.output.size)
        ) {
            // If there's a prior that's different from the present, transition to the present.
            this.start(AnimationState.Rest, [
                // Start at the previous position, no transition
                new Transition(
                    undefined,
                    prior.size,
                    priorPose,
                    0,
                    this.output.style,
                ),
                // Tansition to the new position with resting pose as a baseline, and move on top
                new Transition(
                    undefined,
                    this.output.size,
                    currentPose,
                    this.output.duration,
                    this.output.style,
                ),
            ]);
        }
        // If the new rest is a sequence, start the sequence.
        else if (currentPose instanceof Sequence) {
            const sequence = currentPose.compile(
                undefined,
                undefined,
                this.output.size,
            );
            // If it wasn't empty, prepend a starting state with the original size and pose.
            if (sequence) {
                if (prior) {
                    const priorRestPose =
                        priorPose instanceof Sequence
                            ? priorPose.getFirstPose()
                            : priorPose;
                    if (priorRestPose) {
                        // Update the first keyframe's duration, so there's a transition from the first rest pose.
                        sequence[0] = sequence[0].withDuration(
                            this.output.duration,
                        );
                        // Add the first rest pose as the first keyframe.
                        sequence.unshift(
                            new Transition(
                                undefined,
                                prior.size,
                                priorRestPose,
                                0,
                                this.output.style,
                            ),
                        );
                    }
                }
                this.start(AnimationState.Rest, sequence);
            }
        }
    }

    /** Change to the entering state.  */
    enter() {
        this.log('Changing state of ' + this.name + ' to entering');

        /** If already exiting or done, don't enter. */
        if (this.state === AnimationState.Exiting) return;

        const enter = this.output.entering;
        // No entry pose or animation? Start still.
        if (enter === undefined) this.rest();
        // Otherwise, transition to from entry to rest
        else {
            // Get the first pose of still so we can animate to it.
            const firstStillPose = this.output.getFirstRestPose();
            const entrySequence =
                enter instanceof Pose ? enter : enter.compile();

            const outputInfo = this.animator.scene.get(this.output.getName());

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
                              this.output.size,
                              entrySequence,
                              0,
                              this.output.style,
                          ),
                          new Transition(
                              outputInfo.local,
                              this.output.size,
                              // No first pose? I guess we animate to the entry pose.
                              firstStillPose ?? entrySequence,
                              this.output.duration,
                              this.output.style,
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
                                          this.output.size,
                                          firstStillPose,
                                          this.output.duration,
                                          this.output.style,
                                      ),
                                  ]
                                : []),
                        ] satisfies TransitionSequence)
                      : undefined;

            if (newSequence !== undefined)
                this.start(AnimationState.Entering, newSequence);
        }
    }

    move(prior: Orientation, present: Orientation) {
        const move = this.output.moving ?? this.output.pose;
        const rest = this.output.getFirstRestPose();

        this.log(`Moving from ${prior.toString()} to ${present.toString()}`);

        // If there's a pose, tween the prior and new place, posing while we do it, then transition to the still pose.
        // If the rest is an empty sequence, then just use the move pose.
        if (move instanceof Pose)
            this.start(AnimationState.Moving, [
                // Start at the previous position, no transition
                new Transition(
                    prior.place,
                    this.output.size,
                    rest ? rest.with(move) : move,
                    0,
                    this.output.style,
                ),
                // Tansition to the new position with resting pose as a baseline, and move on top
                new Transition(
                    present.place,
                    this.output.size,
                    rest ? rest.with(move) : move,
                    this.output.duration / 2,
                    this.output.style,
                ),
                // Transition from the move pose to the rest pose.
                new Transition(
                    present.place,
                    this.output.size,
                    rest ?? move,
                    this.output.duration / 2,
                    this.output.style,
                ),
            ]);
        // If move is a sequence, run it, but account for the resting pose.
        else if (move instanceof Sequence) {
            const transitions = move.compile(undefined, rest);

            if (transitions === undefined) return;

            // Add an interpolated place to all of the transitions
            // ensuring a smooth move from one place to the next.
            const totalDuration = transitions.reduce(
                (total, transition) => total + transition.duration,
                0,
            );
            let currentDuration = 0;
            const placed = transitions.map((transition) => {
                currentDuration += transition.duration;
                const percent = currentDuration / totalDuration;
                const interpolatedPlace = new Place(
                    prior.place.value,
                    prior.place.x + (present.place.x - prior.place.x) * percent,
                    prior.place.y + (present.place.y - prior.place.y) * percent,
                    prior.place.z + (present.place.z - prior.place.z) * percent,
                );
                return transition.withPlace(interpolatedPlace);
                // .withRotation(
                //     (prior.rotation ?? 0) +
                //         (present.rotation ?? 0) * percent
                // );
            }) as TransitionSequence;

            // Start the sequence
            this.start(AnimationState.Moving, placed);
        }
    }

    exit() {
        // If already exiting, do nothing, just let it finish.
        if (
            this.state === AnimationState.Exiting ||
            this.state === AnimationState.Done
        )
            return;

        // If there's an exit pose, animate from rest to exit.
        if (this.output.exiting instanceof Pose) {
            // Get the first rest pose.
            const rest = this.output.getFirstRestPose();

            // If the exit is a pose, transition from rest to pose.
            this.start(AnimationState.Exiting, [
                // Start at the previous rest position, or if there isn't one, the exit.
                new Transition(
                    undefined,
                    this.output.size,
                    rest ?? this.output.exiting,
                    0,
                    this.output.style,
                ),
                // Tansition to the new position with resting pose as a baseline, and move on top
                new Transition(
                    undefined,
                    this.output.size,
                    this.output.exiting,
                    this.output.duration,
                    this.output.style,
                ),
            ]);
        } else if (this.output.exiting instanceof Sequence) {
            const sequence = this.output.exiting.compile();
            if (sequence) this.start(AnimationState.Exiting, sequence);
            else this.done();
        }
        // No exit? Mark the animation done and cancel any current animations.
        else this.done();
    }

    // Must have at least two transitions.
    start(
        state: AnimationState,
        transitions: [Transition, Transition, ...Transition[]],
    ) {
        // Don't start any new animations if we're done or already in the state.
        if (this.state === AnimationState.Done) return;

        // Don't start any animations if there's no verse.
        if (this.animator.stage === undefined) return;

        // Cancel any current animation.
        if (this.animation) {
            this.animation.onfinish = null;
            this.animation.cancel();
        }

        // End any current sequence first.
        if (this.sequence) {
            this.animator.endingSequence(this.sequence);
            this.sequence = undefined;
        }

        // Update to the requested state.
        this.state = state;
        this.log(`State => ${this.state}`);

        // Compute the total duration so we can generate offsets for the Web Animation API
        // (and decide whether to animate at all)
        const totalDuration =
            this.context.animationFactor *
            transitions.reduce(
                (total, transition) => total + transition.duration,
                0,
            );

        // No duration? End immediately (unless resting, since
        // that would cause an infinite loop).
        if (totalDuration <= 0) {
            if (this.state !== AnimationState.Rest) this.finish();
            return;
        }

        // Use the sequence to create an animation with the Web Animation API.

        // Find the element corresponding to the phrase in the given stage.
        // We look inside the live stage corresponding to the stae's HTML ID
        const element = document.querySelector(
            `.stage.live[data-id="${this.animator.stage.getHTMLID()}"] [data-id="${this.output.getHTMLID()}"]`,
        );

        // If there's DOM element and this isn't exiting, start an animation.
        // (We have to defer for exits because the output needs to render the new exiting output first.)
        if (!(element instanceof HTMLElement)) {
            this.log(`No HTML element, ending animation`);
            this.done();
            return;
        }

        // Get the info for the output.
        const info =
            this.animator.scene.get(this.output.getName()) ??
            this.animator.exitedInfo.get(this.output.getName());

        if (info === undefined) {
            this.log(`No output info, ending animation.`);
            this.done();
            return;
        }

        // Compute the focus place in this phrase's parent coordinate system.
        const parents = info.parents;
        let offsetFocus: Place | undefined = this.animator.focus;
        if (parents && offsetFocus) {
            for (const parent of parents) {
                if (!(parent instanceof Stage)) {
                    const parentInfo = this.animator.scene.get(
                        parent.getName(),
                    );
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
            // All of this logic should mirror what StageView, GroupView, and PhraseView do.
            if (localPlace && offsetFocus) {
                const layout = this.output.getLayout(this.context);

                keyframe.transform = toOutputTransform(
                    transition.pose,
                    this.output.pose,
                    localPlace,
                    // The offset is the scene focus if it's the stage, offset from focus otherwise
                    this.output instanceof Stage
                        ? this.animator.focus
                        : offsetFocus,
                    // Anything rooted in the stage has no height.
                    // Otherwise, pass the height of the parent, just like
                    // we do in GroupView.
                    this.state === AnimationState.Exiting ||
                        parents[0] instanceof Stage ||
                        parents[0] === undefined
                        ? 0
                        : parents[0].getLayout(this.context).ascent,
                    {
                        width: layout.width * PX_PER_METER,
                        ascent: layout.ascent * PX_PER_METER,
                        descent: layout.descent * PX_PER_METER,
                        height: layout.height * PX_PER_METER,
                    },
                    this.output instanceof Stage
                        ? {
                              width: this.animator.viewportWidth,
                              height: this.animator.viewportHeight,
                          }
                        : undefined,
                );
            }

            // What size should we transition to? Set if specified by the transition.
            if (transition.size !== undefined)
                keyframe.fontSize = sizeToPx(transition.size);

            // Eep, side effect in a higher order function!
            currentOffset +=
                (transition.duration * this.context.animationFactor) /
                totalDuration;

            keyframe.offset = Math.max(0, Math.min(1, currentOffset));
            keyframe.easing = styleToCSSEasing(
                this.animator.evaluator.project.getLocales(),
                transition.style,
            );

            return keyframe;
        });

        this.log(`Starting ${totalDuration}s ${this.state} animation...`);

        // Remember the sequence we're animating so we can highlight elsewhere in the UI.
        this.sequence = transitions;

        // Notify the stage that we're starting the sequence.
        this.animator.startingSequence(transitions);

        // Start the Web Animation API animation...
        this.animation?.cancel();
        this.animation = element.animate(keyframes, {
            // Wordplay durations are seconds
            duration: totalDuration * 1000,
        });

        // When the animation is done, update the animation state.
        this.animation.onfinish = () => {
            this.finish();
        };
    }

    finish() {
        this.log(`Finished; determining next state`);

        // If there's a sequence animating, notify the stage we're ending it.
        if (this.sequence) this.animator.endingSequence(this.sequence);

        // Reset the current sequence.
        this.sequence = undefined;
        // Did entering, still, or move finish? Do rest again.
        if (
            this.state === AnimationState.Entering ||
            this.state === AnimationState.Rest ||
            this.state === AnimationState.Moving
        )
            this.rest();
        // Did it finish exiting? Done.
        else if (this.state === AnimationState.Exiting) this.done();

        // Notify the animator that an animation state changed
        this.animator.updatedAnimationState(this);
    }

    done() {
        this.log(`Animation is done`);

        // If there's a sequence animating, notify the stage we're ending it.
        if (this.sequence) this.animator.endingSequence(this.sequence);

        // Permananently mark the state as done.
        this.state = AnimationState.Done;

        // Cancel any current animations.
        this.animation?.cancel();

        // Notify the stage this ended.
        this.animator.cleanupAnimation(this);
    }

    /** Done if finished exiting or still and there's no move or exit.  */
    isDone() {
        return this.state === AnimationState.Done;
    }
}

const StyleToCSSMapping = {
    straight: 'linear',
    pokey: 'ease-in',
    cautious: 'ease-in-out',
    zippy: 'ease-out',
};

// A cache of values to keys for each locale.
const styleValueToKeyByLocale: Map<Locale, Map<string, string>> = new Map();

function styleToCSSEasing(locales: Locales, name: string | undefined) {
    // No name given? Default to ease out.
    if (name === undefined) return 'ease-out';

    // Get the Easing dictionary from each locale, flatten into a list of key value pairs, and find the name with the matching value.
    for (const locale of locales.getLocales()) {
        const key = getStyleValueToKey(locale).get(name);
        if (key)
            return StyleToCSSMapping[key as keyof typeof StyleToCSSMapping];
    }

    return 'ease-out';
}

function getStyleValueToKey(locale: Locale) {
    let mapping = styleValueToKeyByLocale.get(locale);
    if (mapping) return mapping;

    mapping = new Map();
    for (const [key, value] of Object.entries(locale.output.Easing)) {
        const values = typeof value === 'string' ? [value] : value;
        for (const val of values) mapping.set(val, key);
    }
    styleValueToKeyByLocale.set(locale, mapping);

    return mapping;
}
