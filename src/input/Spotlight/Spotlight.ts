import createStreamEvaluator from '@input/createStreamEvaluator';
import {
    createSlateStructure,
    EmptySlate,
    sameSlate,
    type SlateState,
} from '@input/Scene/Slate';
import { listenForSlates, stopListeningForSlates } from '@input/Scene/slates';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import type Locales from '@locale/Locales';
import Bind from '@nodes/Bind';
import NoneLiteral from '@nodes/NoneLiteral';
import NoneType from '@nodes/NoneType';
import StreamDefinition from '@nodes/StreamDefinition';
import StreamType from '@nodes/StreamType';
import type StructureDefinition from '@nodes/StructureDefinition';
import TextType from '@nodes/TextType';
import type Type from '@nodes/Type';
import UnionType from '@nodes/UnionType';
import type Evaluation from '@runtime/Evaluation';
import StreamValue, { type StreamKind } from '@values/StreamValue';
import type StructureValue from '@values/StructureValue';
import TextValue from '@values/TextValue';

/**
 * A stream of positions in a scene.
 *
 * A Scene shows output; this is how the rest of a program finds out what it is
 * showing, which is what a progress counter, a per-phase soundtrack, and a
 * "press any key" hint all need. Like Beat it always carries a value: before any
 * scene exists, that's `EmptySlate`, so a program reading it to draw with never
 * needs a guard.
 *
 * A spotlight is pushed to rather than read: it is not downstream of the scene it
 * follows, so granular reevaluation would keep its cached value forever and it
 * would never be asked. A scene pushes into every spotlight that hears it and then
 * asks for one evaluation for all of them together, which is what keeps a spotlight
 * and its scene from ever disagreeing within a frame. `marks.ts` is what lets
 * that happen without the two modules importing each other.
 */
export default class Spotlight extends StreamValue<StructureValue, SlateState> {
    readonly kind: StreamKind = 'spotlight';

    /** An optional Scene name to follow. */
    name: string | undefined;

    /** The last position we took, so an unmoved scene adds no value. */
    private state: SlateState = EmptySlate;

    constructor(evaluation: Evaluation, name: string | undefined) {
        super(
            evaluation,
            evaluation.getEvaluator().project.shares.input.Spotlight,
            createSlateStructure(
                evaluation.getEvaluator(),
                evaluation.getCreator(),
                EmptySlate,
            ),
            EmptySlate,
        );

        this.name = name;
        listenForSlates(this.evaluator, this);
    }

    update(name: string | undefined) {
        this.name = name;
    }

    /** Whether this stream follows the scene with the given name. */
    hears(scene: string): boolean {
        return this.name === undefined || this.name === scene;
    }

    /**
     * Take a position from a scene. False when it is the one already held, so a
     * scene that hasn't moved costs nothing.
     *
     * Silent on purpose: a scene pushes into every spotlight that hears it and then
     * asks for one evaluation for itself and all of them together, so a frame
     * can never show one output over another one's position.
     */
    take(state: SlateState): boolean {
        if (sameSlate(this.state, state)) return false;
        this.state = state;
        this.add(
            createSlateStructure(
                this.evaluator,
                this.evaluator.getMain(),
                state,
            ),
            state,
            true,
        );
        return true;
    }

    /** We do not replay spotlights; a scene replays itself and reports again. */
    react() {
        return;
    }

    start() {
        return;
    }

    stop() {
        stopListeningForSlates(this.evaluator, this);
    }

    getType(): Type {
        return StreamType.make(
            this.evaluator.project.shares.input.Slate.getTypeReference(),
        );
    }
}

export function createSpotlightDefinition(
    locales: Locales,
    SlateType: StructureDefinition,
) {
    const NameBind = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Spotlight.name.doc),
        getNameLocales(locales, (locale) => locale.input.Spotlight.name.names),
        UnionType.make(TextType.make(), NoneType.make()),
        NoneLiteral.make(),
    );

    return StreamDefinition.make(
        getDocLocales(locales, (locale) => locale.input.Spotlight.doc),
        getNameLocales(locales, (locale) => locale.input.Spotlight.names),
        [NameBind],
        createStreamEvaluator(
            SlateType.getTypeReference(),
            Spotlight,
            (evaluation) =>
                new Spotlight(
                    evaluation,
                    evaluation.get(NameBind.names, TextValue)?.text,
                ),
            (stream, evaluation) =>
                stream.update(evaluation.get(NameBind.names, TextValue)?.text),
        ),
        SlateType.getTypeReference(),
    );
}
