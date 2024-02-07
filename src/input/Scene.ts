import type Evaluator from '@runtime/Evaluator';
import Bind from '../nodes/Bind';
import StreamDefinition from '../nodes/StreamDefinition';
import StreamType from '../nodes/StreamType';
import { getDocLocales } from '../locale/getDocLocales';
import { getNameLocales } from '../locale/getNameLocales';
import createStreamEvaluator from './createStreamEvaluator';
import type Locales from '../locale/Locales';
import StructureType from '@nodes/StructureType';
import ListType from '@nodes/ListType';
import type StructureDefinition from '@nodes/StructureDefinition';
import ListValue from '@values/ListValue';
import StructureValue from '@values/StructureValue';
import NoneValue from '@values/NoneValue';
import StreamValue from '@values/StreamValue';
import { NameGenerator } from '@output/Stage';
import { toOutput } from '@output/toOutput';
import OutputAnimation, { AnimationState } from '@output/OutputAnimation';
import UnionType from '@nodes/UnionType';
import type { OutputName } from '@output/Animator';
import BooleanType from '@nodes/BooleanType';
import BoolValue from '@values/BoolValue';

export default class Scene extends StreamValue<
    StructureValue | NoneValue,
    StructureValue | NoneValue
> {
    /** The current index in the list of outputs being shown. We start before the first output, but immediately move to it when the stream starts. */
    private index = -1;
    /** The animated output values we're currently tracking, or undefined if we aren't waiting for any */
    private pendingAnimations: Set<OutputName> | undefined = undefined;
    /** The current list of outputs being animated through */
    private outputs: (StructureValue | BoolValue)[];
    /** The timer ID we're using to track the current output, if any */
    private timer: NodeJS.Timeout | undefined = undefined;
    /** Whether we're in the middle of updating a dynamic output. Prevents infinite recursion. */
    private updating = false;

    constructor(evaluator: Evaluator, outputs: ListValue) {
        // Get the first value in the list, if there is one.
        // If there isn't create a none value.
        const firstValue = outputs.get(1);
        const firstOutput =
            firstValue instanceof StructureValue
                ? firstValue
                : new NoneValue(
                      evaluator.getCurrentEvaluation()?.getCreator() ??
                          evaluator.project.getMain(),
                  );

        super(
            evaluator,
            evaluator.project.shares.input.Scene,
            firstOutput,
            firstOutput,
        );

        // Update the outputs.
        this.outputs = this.filterOutputs(outputs);
    }

    /** When starting, we start tracking the first value's animation state */
    start() {
        this.next();
    }

    /** If we're tracking a timer, clear it. */
    stop() {
        if (this.timer) clearTimeout(this.timer);
    }

    /** We do not replay scenes, they replay themselves, so we do nothing with replayed values **/
    react() {}

    getType() {
        return StreamType.make(
            UnionType.make(
                new StructureType(this.evaluator.project.shares.output.Phrase),
                new StructureType(this.evaluator.project.shares.output.Group),
            ),
        );
    }

    /** Take the list of outputs provided and filter it down to only outputs, in case the creator
     * provides non-output. They'll get a type error on those */
    filterOutputs(outputs: ListValue): StructureValue[] {
        // Exclude any values in the list that are not outputs
        return outputs.values.filter(
            (val): val is StructureValue =>
                val instanceof BoolValue ||
                (val instanceof StructureValue &&
                    (val.is(this.evaluator.project.shares.output.Phrase) ||
                        val.is(this.evaluator.project.shares.output.Group))),
        );
    }

    updateOutputs(outputs: ListValue) {
        // Reset the outputs to the new ones provided so that they're
        // refreshed for the next output.
        this.outputs = this.filterOutputs(outputs);

        // Get the updated output to show
        const output = this.outputs[this.index];
        // Get the latest value
        const latest = this.latest();
        // Is the new value a structure?
        if (output instanceof StructureValue) {
            // Update the output to the latest if it changed.
            // It is cool to do live updates of the output
            // when they change, but this can actually create an infinite loop
            // of updates when content is random, since to show the new output
            // we need to push the changed output as a new value in the stream,
            // which triggers a reevaluation, which creates a new random value again,
            // which pushes a new output, which causes a reevaluation again, which creates a new random value, ad infinitum.
            // These dynamic updates only work when reevaluated streams evaluate to the same
            // value after updating the output.
            // To prevent this, we keep track of whether we're updating, and only react once to a new value.
            if (latest && !latest.isEqualTo(output) && !this.updating) {
                this.updating = true;
                this.add(output, output, true);
                this.updating = false;
            }
        }
        // If it's a boolean, and its true, advance.
        else if (output.bool) {
            this.next();
        }
    }

    /** See if the current output is animated, and if its not, set a timer for it's duration that moves to the next output once done. */
    next() {
        // At the end? Do nothing.
        if (this.index === this.outputs.length - 1) return;

        // If we're currently at a boolean, and it's false, don't advance.
        const currentValue = this.outputs[this.index];
        if (currentValue instanceof BoolValue && currentValue.bool === false)
            return;

        // Next index.
        this.index++;

        // Get the output to show
        const output = this.outputs[this.index];

        // Is the output a boolean? Don't advance the index quite yet.
        if (output instanceof BoolValue) {
            // If it's true, advance to the next output
            if (output.bool) this.next();
        }
        // Otherwise, it's a structure.
        else {
            // See if it's a valid output, generating unique names.
            const out = toOutput(this.evaluator, output, new NameGenerator());

            // If it's an output,
            if (out) {
                // React to it, updating the stage with it.
                this.add(output, output);

                // Get the animated output inside it.
                const animated = new Set(
                    out.getEntryAnimated().map((out) => out.getName()),
                );
                // If this next output and none of it's nested outputs have an entry animation, then wait this
                // output's duration before showing the next, since the Animator won't animate it and notify us
                // so we have to notify ourselves.
                if (animated.size === 0) {
                    // Only do this if there isn't a timer set, so we advance independent of how many times the output changes.

                    if (this.timer !== undefined) clearTimeout(this.timer);
                    this.timer = setTimeout(() => {
                        this.next();
                        this.timer = undefined;
                    }, out.duration * 1000);
                    this.pendingAnimations = undefined;
                }
                // Otherwise, we wait for all of the animations to finish.
                else this.pendingAnimations = animated;
            }
            // If it's not valid output or a boolean, move to the next one.
            else {
                this.next();
            }
        }
    }

    /** When the animation state changes, see if it was part of the current output. */
    handleAnimationStateChange(animation: OutputAnimation) {
        // Not waiting for any animations? Do nothing.
        if (this.pendingAnimations === undefined) return;

        // Is this an animation we're waiting for?
        if (this.pendingAnimations.has(animation.name)) {
            if (animation.state === AnimationState.Rest) animation.exit();
            if (animation.isDone())
                // If it's state is done, then stop waiting for it.
                this.pendingAnimations.delete(animation.name);
        }

        // Did all the animations finish? Move to the next output.
        if (this.pendingAnimations.size === 0) {
            this.next();
        }
    }
}

export function createSceneDefinition(
    locale: Locales,
    phrase: StructureDefinition,
    group: StructureDefinition,
): StreamDefinition {
    const streamOutputType = UnionType.make(
        new StructureType(phrase),
        new StructureType(group),
    );
    const streamInputType = UnionType.make(
        streamOutputType.clone(),
        BooleanType.make(),
    );

    const OutputsBind = Bind.make(
        getDocLocales(locale, (locale) => locale.input.Scene.outputs.doc),
        getNameLocales(locale, (locale) => locale.input.Scene.outputs.names),
        ListType.make(streamInputType.clone()),
    );

    return StreamDefinition.make(
        getDocLocales(locale, (locale) => locale.input.Scene.doc),
        getNameLocales(locale, (locale) => locale.input.Scene.names),
        [OutputsBind],
        createStreamEvaluator(
            streamOutputType.clone(),
            Scene,
            // On initial creation, get the list of outputs provided
            (evaluation) =>
                new Scene(
                    evaluation.getEvaluator(),
                    // If we don't find a list, default to an empty list.
                    evaluation.get(OutputsBind.names, ListValue) ??
                        new ListValue(evaluation.getCreator(), []),
                ),
            // On update, update the list of outputs provided
            (stream, evaluation) => {
                stream.updateOutputs(
                    evaluation.get(OutputsBind.names, ListValue) ??
                        new ListValue(evaluation.getCreator(), []),
                );
            },
        ),
        streamOutputType.clone(),
    );
}
