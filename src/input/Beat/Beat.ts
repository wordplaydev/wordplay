import createStreamEvaluator from '@input/createStreamEvaluator';
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
import StreamValue from '@values/StreamValue';
import type StructureValue from '@values/StructureValue';
import TextValue from '@values/TextValue';
import {
    createDownbeatStructure,
    SilentDownbeat,
    type DownbeatState,
} from '@output/Music/Downbeat';
import type { StreamKind } from '@values/StreamValue';

/**
 * What the music player hands to the stream on each audible beat: everything
 * the player knows at that moment, so creator-authored visuals can be as rich
 * as the built-in renderings.
 */
export type BeatEvent = DownbeatState;

/**
 * A stream of beats, pushed by the music player rather than ticked by the
 * evaluator's frame loop — the Collision pattern. It only ticks while music is
 * playing, but it always carries a Downbeat: before the first beat that's
 * `SilentDownbeat`, so a program that reads it to draw with never needs a guard.
 * Pointer does the same with a zero Place.
 */
export default class Beat extends StreamValue<StructureValue, BeatEvent> {
    readonly kind: StreamKind = 'beat';

    /** An optional Music name to filter beats to. */
    name: string | undefined;

    constructor(evaluation: Evaluation, name: string | undefined) {
        super(
            evaluation,
            evaluation.getEvaluator().project.shares.input.Beat,
            createDownbeatStructure(
                evaluation.getEvaluator(),
                evaluation.getCreator(),
                SilentDownbeat,
            ),
            SilentDownbeat,
        );

        this.name = name;
    }

    update(name: string | undefined) {
        this.name = name;
    }

    react(event: BeatEvent) {
        // A named stream only hears the music it names.
        if (this.name !== undefined && this.name !== event.name) return;
        this.add(
            createDownbeatStructure(
                this.evaluator,
                this.evaluator.getMain(),
                event,
            ),
            event,
        );
    }

    start() {
        return;
    }

    stop() {
        return;
    }

    getType(): Type {
        return StreamType.make(
            this.evaluator.project.shares.output.Downbeat.getTypeReference(),
        );
    }
}

export function createBeatDefinition(
    locales: Locales,
    DownbeatType: StructureDefinition,
) {
    const NameBind = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Beat.name.doc),
        getNameLocales(locales, (locale) => locale.input.Beat.name.names),
        UnionType.make(TextType.make(), NoneType.make()),
        NoneLiteral.make(),
    );

    return StreamDefinition.make(
        getDocLocales(locales, (locale) => locale.input.Beat.doc),
        getNameLocales(locales, (locale) => locale.input.Beat.names),
        [NameBind],
        createStreamEvaluator(
            DownbeatType.getTypeReference(),
            Beat,
            (evaluation) =>
                new Beat(
                    evaluation,
                    evaluation.get(NameBind.names, TextValue)?.text,
                ),
            (stream, evaluation) =>
                stream.update(evaluation.get(NameBind.names, TextValue)?.text),
        ),
        DownbeatType.getTypeReference(),
    );
}
