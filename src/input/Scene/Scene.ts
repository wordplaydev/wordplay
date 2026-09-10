import createStreamEvaluator from '@input/createStreamEvaluator';
import { sameSlate, type SlateState } from '@input/Scene/Slate';
import { reportSlate, type SlateListener } from '@input/Scene/slates';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import type Locales from '@locale/Locales';
import Bind from '@nodes/Bind';
import BooleanLiteral from '@nodes/BooleanLiteral';
import BooleanType from '@nodes/BooleanType';
import ListType from '@nodes/ListType';
import NoneLiteral from '@nodes/NoneLiteral';
import NoneType from '@nodes/NoneType';
import NumberType from '@nodes/NumberType';
import StreamDefinition from '@nodes/StreamDefinition';
import StreamType from '@nodes/StreamType';
import type StructureDefinition from '@nodes/StructureDefinition';
import StructureType from '@nodes/StructureType';
import TextType from '@nodes/TextType';
import UnionType from '@nodes/UnionType';
import type { OutputName } from '@output/animation/Animator';
import OutputAnimation, {
    AnimationState,
} from '@output/animation/OutputAnimation';
import { NameGenerator } from '@output/Output/Stage';
import { toOutput } from '@output/Output/toOutput';
import type Evaluation from '@runtime/Evaluation';
import BoolValue from '@values/BoolValue';
import ListValue from '@values/ListValue';
import NoneValue from '@values/NoneValue';
import NumberValue from '@values/NumberValue';
import StreamValue, { type StreamKind } from '@values/StreamValue';
import StructureValue from '@values/StructureValue';
import TextValue from '@values/TextValue';
import type Value from '@values/Value';

/** One thing in a scene's list: something to show, or a condition to wait at. */
type SceneItem = StructureValue | BoolValue;

/** Where to send a scene: an output's position, counting from 1, or its name. */
export type SceneTarget = number | string;

export default class Scene extends StreamValue<
    StructureValue | NoneValue,
    StructureValue | NoneValue
> {
    readonly kind: StreamKind = 'scene';

    /** The outputs to show and the conditions to wait at, in the order given. */
    private items: SceneItem[] = [];
    /** Where each output sits in `items`. Conditions are not in here, which is
     * what makes `index`, `total`, and `go` count only things a viewer can see:
     * a three-slide show with a click between each is "1 of 3", not "1 of 5". */
    private outputs: number[] = [];
    /** Where we are in `items`. Before the first, until the stream starts. */
    private cursor = -1;
    /** How many times we've come back around. 0 the first time through. */
    private lap = 0;
    /** Whether this lap has waited for anything at all. A lap of zero-duration
     * outputs would otherwise come around at frame rate forever. */
    private lapWaited = false;

    /** The scene's own name, which is what a Spotlight filters on. */
    private name: string | undefined = undefined;
    private looping = false;
    private paused = false;
    /** A condition to wait for after every output, or undefined for none. */
    private until: boolean | undefined = undefined;
    /** Whether we're held at that condition right now. */
    private awaiting = false;

    /** The animated output values we're currently tracking, or undefined if we aren't waiting for any */
    private pendingAnimations: Set<OutputName> | undefined = undefined;
    /** The timer we're using to track the current output, if any */
    private timer: NodeJS.Timeout | undefined = undefined;
    /** What that timer was set for, and when, so a pause can give back what
     * was left of it rather than starting the wait over. */
    private timerStartedAt: number | undefined = undefined;
    private timerDurationMs: number | undefined = undefined;
    private timerRemainingMs: number | undefined = undefined;

    /** Whether we're in the middle of updating a dynamic output. Prevents infinite recursion. */
    private updating = false;
    /** Set by `show` so `advance` knows whether the value actually changed. */
    private cutting = false;
    /** Nothing more from a stopped scene, however late a callback arrives. */
    private stopped = false;

    constructor(
        evaluation: Evaluation,
        outputs: ListValue,
        loop: boolean,
        until: boolean | undefined,
        pause: boolean,
        name: string | undefined,
    ) {
        // Get the first value in the list, if there is one.
        // If there isn't create a none value.
        const firstValue = outputs.get(1);
        const firstOutput =
            firstValue instanceof StructureValue
                ? firstValue
                : new NoneValue(evaluation.getCreator());

        super(
            evaluation,
            evaluation.getEvaluator().project.shares.input.Scene,
            firstOutput,
            firstOutput,
        );

        this.looping = loop;
        this.until = until;
        this.paused = pause;
        this.name = name;
        this.setItems(outputs);
    }

    /** When starting, we start tracking the first value's animation state */
    start() {
        // Arriving is not advancing: a scene told to pause still shows its first
        // output, which is the value it already holds, so a spotlight has to agree
        // that that is where it is. Without this a slide show — paused for good,
        // stepped only by `go` — would show its first slide and report being
        // nowhere.
        const paused = this.paused;
        this.paused = false;
        // Always ask for an evaluation, even when nothing moved: a spotlight created
        // after this scene — a program that binds them in that order — otherwise
        // reads zero forever. The scene asked for one anyway before, by adding
        // its first output loudly.
        this.advance(true);
        this.paused = paused;
    }

    /** Stop for good: clear the timer, and refuse anything that arrives after.
     * The Animator can still reach a stopped scene with a late animation
     * report, and without this that report would set a fresh timer. */
    stop() {
        this.stopped = true;
        this.clearTimer();
        this.pendingAnimations = undefined;
    }

    /** We do not replay scenes, they replay themselves, so we do nothing with replayed values **/
    react() {
        return;
    }

    getType() {
        return StreamType.make(
            UnionType.make(
                new StructureType(this.evaluator.project.shares.output.Phrase),
                UnionType.make(
                    new StructureType(
                        this.evaluator.project.shares.output.Group,
                    ),
                    new StructureType(
                        this.evaluator.project.shares.output.Shape,
                    ),
                ),
            ),
        );
    }

    /** Whether a value in the list is something we can show. */
    private isOutput(value: Value): value is StructureValue {
        return (
            value instanceof StructureValue &&
            (value.is(this.evaluator.project.shares.output.Phrase) ||
                value.is(this.evaluator.project.shares.output.Group) ||
                value.is(this.evaluator.project.shares.output.Shape))
        );
    }

    /** Take the list of outputs provided and filter it down to only outputs and
     * conditions, in case the creator provides something else. They'll get a
     * type error on those. */
    private setItems(outputs: ListValue) {
        this.items = outputs.values.filter(
            (val): val is SceneItem =>
                val instanceof BoolValue || this.isOutput(val),
        );
        this.outputs = this.items.reduce((positions: number[], item, index) => {
            if (item instanceof StructureValue) positions.push(index);
            return positions;
        }, []);
    }

    /** Everything read from the scene's inputs on every reevaluation. */
    update(
        outputs: ListValue,
        loop: boolean,
        until: boolean | undefined,
        replay: boolean,
        pause: boolean,
        go: SceneTarget | undefined,
        step: number | undefined,
        name: string | undefined,
    ) {
        if (this.stopped) return;

        this.name = name;
        this.looping = loop;
        this.until = until;
        // Reset the items to the new ones provided so that they're
        // refreshed for the next output.
        this.setItems(outputs);
        this.setPaused(pause);

        // A restart or a jump replaces wherever we were; otherwise carry on from
        // where we are. A scene handed both starts over, since that is the
        // larger of the two instructions.
        if (replay) this.restart();
        else if (go !== undefined) this.seek(go);
        else if (step !== undefined)
            this.seek(this.position() + Math.round(step));
        else {
            this.refresh();
            // Standing at a condition that has become true, or held by an
            // `until` that has? Move on.
            const at = this.items[this.cursor];
            if (this.awaiting && this.until === true) {
                // Released: go on past the output we were held after.
                this.awaiting = false;
                this.walk();
            } else if (at instanceof BoolValue && at.bool) this.next();
        }

        // Everything here happens inside an evaluation that is already running,
        // so the spotlights take their new positions silently and that evaluation
        // reads them as it goes. It still has to ask for another one when a spotlight
        // moved: granular reevaluation only discards what a *changed* stream
        // reaches, so anything drawn from a spotlight in an evaluation that had
        // already passed it — a counter above the scene, a `go` computed from
        // `index` — would otherwise keep the value it cached and the scene would
        // never move again. Asking while an evaluation is running queues it,
        // which is what makes this one more pass rather than recursion.
        const heard = this.report();
        if (heard.length > 0) this.evaluator.evaluate(heard);
    }

    /** Show the latest version of the output we're on, for a scene whose
     * content is computed and has changed since we showed it. */
    private refresh() {
        const item = this.items[this.cursor];
        if (!(item instanceof StructureValue)) return;
        const latest = this.latest();
        // It is cool to do live updates of the output when they change, but
        // this can create an infinite loop of updates when content is random,
        // since to show the new output we push it as a new value in the stream,
        // which triggers a reevaluation, which creates a new random value
        // again, ad infinitum. These dynamic updates only work when reevaluated
        // streams evaluate to the same value after updating the output. To
        // prevent this, we keep track of whether we're updating, and only react
        // once to a new value.
        if (latest !== undefined && !latest.isEqualTo(item) && !this.updating) {
            this.updating = true;
            this.add(item, item, true);
            this.updating = false;
        }
    }

    /**
     * Walk forward from where we are until something stops us: an output to
     * show, a condition that isn't true yet, or the end.
     *
     * A loop rather than the recursion this used to be, because looping makes
     * "every item is a condition that is already true" reachable, and that
     * recursed until the stack gave out.
     */
    private next() {
        if (this.stopped || this.paused) return;

        // An `until` is a condition standing after every output, so having
        // finished the one we're on we stop here. Written in the list it would
        // be the same thing, one copy per output — and like one written in the
        // list it is answered by whoever is holding a fresh value, which is
        // `update`. Reading the one we were last handed would answer with
        // whatever was true when the output began, so a momentary condition
        // would still be true when its time ran out and let the scene through.
        if (
            this.until !== undefined &&
            this.items[this.cursor] instanceof StructureValue
        ) {
            this.awaiting = true;
            this.lapWaited = true;
            return;
        }

        this.walk();
    }

    /** Move on, having already decided that we may. */
    private walk() {
        if (this.stopped || this.paused) return;

        let steps = 0;
        const limit = this.items.length + 1;

        while (steps++ < limit) {
            // At the end? Come back around only if we're looping, and only if
            // this lap waited for something — otherwise a list of instant
            // outputs would go round forever as fast as the machine allows.
            if (this.cursor >= this.items.length - 1) {
                if (!this.looping || !this.lapWaited) return;
                this.cursor = -1;
                this.lap++;
                this.lapWaited = false;
            }

            this.cursor++;
            const item = this.items[this.cursor];
            if (item === undefined) return;

            // A condition: true walks on, false waits here.
            if (item instanceof BoolValue) {
                if (item.bool) continue;
                this.lapWaited = true;
                return;
            }

            // Something to show. If it isn't valid output, keep walking.
            if (this.show(item)) return;
        }
    }

    /** Show an output and set up whatever we wait on before moving past it.
     * False when the value isn't something we can show, so the walk goes on. */
    private show(output: StructureValue): boolean {
        // See if it's a valid output, generating unique names.
        const out = toOutput(this.evaluator, output, new NameGenerator());
        if (out === undefined) return false;

        // React to it, updating the stage with it.
        this.add(output, output, true);
        this.cutting = true;

        // Get the animated output inside it.
        const animated = new Set(
            out.getEntryAnimated().map((each) => each.getName()),
        );
        // If this next output and none of its nested outputs have an entry
        // animation, then wait this output's duration before showing the next,
        // since the Animator won't animate it and notify us, so we have to
        // notify ourselves.
        if (animated.size === 0) {
            this.pendingAnimations = undefined;
            this.startTimer(out.duration * 1000);
        }
        // Otherwise, we wait for all of the animations to finish.
        else {
            this.clearTimer();
            this.pendingAnimations = animated;
            this.lapWaited = true;
        }
        return true;
    }

    private startTimer(ms: number) {
        this.clearTimer();
        // A zero duration is not a wait, and saying it is would let a scene of
        // instant outputs loop forever.
        if (ms > 0) this.lapWaited = true;
        // Held: keep the wait rather than running it down while we're stopped,
        // so letting go gives back all of it.
        if (this.paused) {
            this.timerRemainingMs = ms;
            return;
        }
        this.timerDurationMs = ms;
        this.timerStartedAt = Date.now();
        this.timer = setTimeout(() => {
            this.timer = undefined;
            this.timerDurationMs = undefined;
            this.advance();
        }, ms);
    }

    private clearTimer() {
        if (this.timer !== undefined) clearTimeout(this.timer);
        this.timer = undefined;
        this.timerDurationMs = undefined;
    }

    private setPaused(pause: boolean) {
        if (pause === this.paused) return;
        this.paused = pause;
        if (pause) {
            // Remember what was left, so letting go finishes the output we were
            // on rather than starting its time over.
            if (
                this.timer !== undefined &&
                this.timerStartedAt !== undefined &&
                this.timerDurationMs !== undefined
            )
                this.timerRemainingMs = Math.max(
                    0,
                    this.timerDurationMs - (Date.now() - this.timerStartedAt),
                );
            this.clearTimer();
        } else if (this.timerRemainingMs !== undefined) {
            const remaining = this.timerRemainingMs;
            this.timerRemainingMs = undefined;
            this.startTimer(remaining);
        } else if (
            this.pendingAnimations === undefined ||
            this.pendingAnimations.size === 0
        ) {
            // Whatever we were waiting for finished while we were held.
            this.pendingAnimations = undefined;
            this.next();
        }
    }

    /** Start over from the first output. */
    private restart() {
        this.clearTimer();
        this.timerRemainingMs = undefined;
        this.pendingAnimations = undefined;
        this.cursor = -1;
        this.lap = 0;
        this.lapWaited = false;
        this.awaiting = false;
        this.next();
    }

    /** Go to an output by position or by name, then carry on from there. */
    private seek(target: SceneTarget) {
        const total = this.outputs.length;
        if (total === 0) return;

        let index: number;
        if (typeof target === 'string') {
            const found = this.outputs.findIndex(
                (position) => this.nameOf(this.items[position]) === target,
            );
            if (found < 0) return;
            index = found + 1;
        } else {
            const asked = Math.round(target);
            // Past an end we stop at it, unless the ends are joined, which is
            // what `loop` already means. That is what saves a creator from
            // range checks around every step forward and back.
            index = this.looping
                ? ((((asked - 1) % total) + total) % total) + 1
                : Math.min(Math.max(asked, 1), total);
        }

        // Sending a scene where it already is is not a move: re-showing would
        // start the output's time over and play its entry animation again, and
        // `replay` is how a creator asks for that.
        if (index === this.position()) return;

        this.clearTimer();
        this.timerRemainingMs = undefined;
        this.pendingAnimations = undefined;
        this.awaiting = false;
        this.cursor = this.outputs[index - 1];
        const item = this.items[this.cursor];
        if (item instanceof StructureValue) this.show(item);
    }

    /** What an output is called: the same name animations, `Choice`, and
     * `Collision` know it by, so a creator names a step once. An output given no
     * name of its own answers to its node's id, which is not something anyone
     * would write in a `go`. The generator is fresh each time, so a name is
     * never handed back with a collision suffix it wouldn't have on its own. */
    private nameOf(item: SceneItem | undefined): string | undefined {
        if (!(item instanceof StructureValue)) return undefined;
        return toOutput(this.evaluator, item, new NameGenerator())?.getName();
    }

    /** Which output we're on, counting from 1; 0 before we've reached one.
     * Not `at`, which `StreamValue` already declares for `←`. */
    private position(): number {
        const at = this.outputs.indexOf(this.cursor);
        return at < 0 ? 0 : at + 1;
    }

    /** Where we are, which is what a Spotlight reports. */
    slateState(): SlateState {
        const item = this.items[this.cursor];
        return {
            scene: this.name ?? '',
            index: this.position(),
            total: this.outputs.length,
            lap: this.lap,
            waiting:
                this.paused ||
                this.awaiting ||
                (item instanceof BoolValue && item.bool === false),
        };
    }

    /** Tell every spotlight that follows this scene where it is. */
    private report(): SlateListener[] {
        return reportSlate(this.evaluator, this.slateState());
    }

    /**
     * Move on from outside an evaluation — a timer running out, or an animation
     * finishing. Nothing else is running, so this is what asks for one, and it
     * asks for exactly one covering the scene and every spotlight that heard it: two
     * would render a frame showing one output over another one's position.
     *
     * A scene that has only started waiting has changed nothing a viewer can see
     * and something every spotlight reports, which is why the spotlights decide this as much
     * as the output does.
     */
    private advance(force = false) {
        if (this.stopped) return;
        this.cutting = false;
        const before = this.slateState();
        this.next();
        const heard = this.report();
        // Coming to rest at a condition shows nothing new and changes where the
        // scene is, and it is also the only moment an `until` gets to be asked
        // again — so a scene with no spotlight at all still needs the evaluation, or
        // one whose condition is already true would wait there forever.
        const moved = this.cutting || !sameSlate(before, this.slateState());
        const changed: SlateListener[] | StreamValue[] =
            moved || force ? [this, ...heard] : heard;
        if (changed.length > 0) this.evaluator.evaluate(changed);
    }

    /** When the animation state changes, see if it was part of the current output. */
    handleAnimationStateChange(animation: OutputAnimation) {
        if (this.stopped) return;
        // Not waiting for any animations? Do nothing.
        if (this.pendingAnimations === undefined) return;
        // Not an animation we're waiting for? Also do nothing — without this,
        // any animation at all could move the scene on while the set happened
        // to be empty.
        if (!this.pendingAnimations.has(animation.name)) return;

        if (animation.state === AnimationState.Rest) animation.exit();
        // If its state is done, then stop waiting for it.
        if (animation.isDone()) this.pendingAnimations.delete(animation.name);

        // Did all the animations finish? Move to the next output.
        if (this.pendingAnimations.size === 0) {
            this.pendingAnimations = undefined;
            this.advance();
        }
    }
}

export function createSceneDefinition(
    locale: Locales,
    phrase: StructureDefinition,
    group: StructureDefinition,
    shape: StructureDefinition,
): StreamDefinition {
    const streamOutputType = UnionType.make(
        new StructureType(phrase),
        UnionType.make(new StructureType(group), new StructureType(shape)),
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

    const LoopBind = Bind.make(
        getDocLocales(locale, (locale) => locale.input.Scene.loop.doc),
        getNameLocales(locale, (locale) => locale.input.Scene.loop.names),
        BooleanType.make(),
        BooleanLiteral.make(false),
    );

    const UntilBind = Bind.make(
        getDocLocales(locale, (locale) => locale.input.Scene.until.doc),
        getNameLocales(locale, (locale) => locale.input.Scene.until.names),
        UnionType.make(BooleanType.make(), NoneType.make()),
        NoneLiteral.make(),
    );

    const ReplayBind = Bind.make(
        getDocLocales(locale, (locale) => locale.input.Scene.replay.doc),
        getNameLocales(locale, (locale) => locale.input.Scene.replay.names),
        BooleanType.make(),
        BooleanLiteral.make(false),
    );

    const PauseBind = Bind.make(
        getDocLocales(locale, (locale) => locale.input.Scene.pause.doc),
        getNameLocales(locale, (locale) => locale.input.Scene.pause.names),
        BooleanType.make(),
        BooleanLiteral.make(false),
    );

    const GoBind = Bind.make(
        getDocLocales(locale, (locale) => locale.input.Scene.go.doc),
        getNameLocales(locale, (locale) => locale.input.Scene.go.names),
        UnionType.make(
            NumberType.make(),
            UnionType.make(TextType.make(), NoneType.make()),
        ),
        NoneLiteral.make(),
    );

    const StepBind = Bind.make(
        getDocLocales(locale, (locale) => locale.input.Scene.step.doc),
        getNameLocales(locale, (locale) => locale.input.Scene.step.names),
        UnionType.make(NumberType.make(), NoneType.make()),
        NoneLiteral.make(),
    );

    const NameBind = Bind.make(
        getDocLocales(locale, (locale) => locale.input.Scene.name.doc),
        getNameLocales(locale, (locale) => locale.input.Scene.name.names),
        UnionType.make(TextType.make(), NoneType.make()),
        NoneLiteral.make(),
    );

    function outputsOf(evaluation: Evaluation): ListValue {
        return (
            evaluation.get(OutputsBind.names, ListValue) ??
            new ListValue(evaluation.getCreator(), [])
        );
    }

    function boolOf(evaluation: Evaluation, bind: Bind): boolean {
        return evaluation.get(bind.names, BoolValue)?.bool ?? false;
    }

    /** ø means no condition was given, which is not the same as one that is ⊥. */
    function untilOf(evaluation: Evaluation): boolean | undefined {
        return evaluation.get(UntilBind.names, BoolValue)?.bool;
    }

    function stepOf(evaluation: Evaluation): number | undefined {
        return evaluation.get(StepBind.names, NumberValue)?.toNumber();
    }

    function nameOf(evaluation: Evaluation): string | undefined {
        return evaluation.get(NameBind.names, TextValue)?.text;
    }

    /** A number or a name, whichever the creator handed us; ø means stay put. */
    function goOf(evaluation: Evaluation): SceneTarget | undefined {
        const position = evaluation.get(GoBind.names, NumberValue);
        if (position !== undefined) return position.toNumber();
        return evaluation.get(GoBind.names, TextValue)?.text;
    }

    return StreamDefinition.make(
        getDocLocales(locale, (locale) => locale.input.Scene.doc),
        getNameLocales(locale, (locale) => locale.input.Scene.names),
        [
            OutputsBind,
            LoopBind,
            UntilBind,
            ReplayBind,
            PauseBind,
            GoBind,
            StepBind,
            NameBind,
        ],
        createStreamEvaluator(
            streamOutputType.clone(),
            Scene,
            // On initial creation, get the list of outputs provided
            (evaluation) =>
                new Scene(
                    evaluation,
                    outputsOf(evaluation),
                    boolOf(evaluation, LoopBind),
                    untilOf(evaluation),
                    boolOf(evaluation, PauseBind),
                    nameOf(evaluation),
                ),
            // On update, update the list of outputs and everything else the
            // creator can change while the scene is playing.
            (stream, evaluation) => {
                stream.update(
                    outputsOf(evaluation),
                    boolOf(evaluation, LoopBind),
                    untilOf(evaluation),
                    boolOf(evaluation, ReplayBind),
                    boolOf(evaluation, PauseBind),
                    goOf(evaluation),
                    stepOf(evaluation),
                    nameOf(evaluation),
                );
            },
        ),
        streamOutputType.clone(),
    );
}
