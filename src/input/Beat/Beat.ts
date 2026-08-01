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
import NoneValue from '@values/NoneValue';
import StreamValue from '@values/StreamValue';
import type StructureValue from '@values/StructureValue';
import TextValue from '@values/TextValue';
import { createDownbeatStructure } from '@output/Music/Downbeat';

/** What the music player hands to the stream on each audible beat. */
export type BeatEvent = {
    /** The name of the Music that beat. */
    music: string;
    /** Beats since that music started, 0 first. */
    count: number;
    /** The instruments sounding on this beat. */
    instruments: readonly string[];
};

/**
 * A stream of beats, pushed by the music player rather than ticked by the
 * evaluator's frame loop — the Collision pattern. It only ticks while music
 * is playing, so its value starts at ø and a program reading it guards.
 */
export default class Beat extends StreamValue<
    StructureValue | NoneValue,
    BeatEvent | undefined
> {
    /** An optional Music name to filter beats to. */
    music: string | undefined;

    constructor(evaluation: Evaluation, music: string | undefined) {
        super(
            evaluation,
            evaluation.getEvaluator().project.shares.input.Beat,
            new NoneValue(evaluation.getCreator()),
            undefined,
        );

        this.music = music;
    }

    update(music: string | undefined) {
        this.music = music;
    }

    react(event: BeatEvent | undefined) {
        if (event === undefined) {
            this.add(new NoneValue(this.creator), undefined);
            return;
        }
        // A named stream only hears the music it names.
        if (this.music !== undefined && this.music !== event.music) return;
        this.add(
            createDownbeatStructure(
                this.evaluator,
                this.evaluator.getMain(),
                event.count,
                event.instruments,
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
    const MusicBind = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Beat.music.doc),
        getNameLocales(locales, (locale) => locale.input.Beat.music.names),
        UnionType.make(TextType.make(), NoneType.make()),
        NoneLiteral.make(),
    );

    return StreamDefinition.make(
        getDocLocales(locales, (locale) => locale.input.Beat.doc),
        getNameLocales(locales, (locale) => locale.input.Beat.names),
        [MusicBind],
        createStreamEvaluator(
            DownbeatType.getTypeReference(),
            Beat,
            (evaluation) =>
                new Beat(
                    evaluation,
                    evaluation.get(MusicBind.names, TextValue)?.text,
                ),
            (stream, evaluation) =>
                stream.update(
                    evaluation.get(MusicBind.names, TextValue)?.text,
                ),
        ),
        UnionType.make(DownbeatType.getTypeReference(), NoneType.make()),
    );
}
