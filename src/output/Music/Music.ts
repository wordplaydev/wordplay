import toStructure from '@basis/toStructure';
import type Project from '@db/projects/Project';
import type Locales from '@locale/Locales';
import { getBind } from '@locale/getBind';
import { SHARE_SYMBOL, TYPE_SYMBOL } from '@parser/Symbols';
import Decimal from 'decimal.js';
import type Bind from '@nodes/Bind';
import type StructureDefinition from '@nodes/StructureDefinition';
import Unit from '@nodes/Unit';
import type Evaluator from '@runtime/Evaluator';
import ListValue from '@values/ListValue';
import NumberValue from '@values/NumberValue';
import StructureValue from '@values/StructureValue';
import type TextValue from '@values/TextValue';
import type Value from '@values/Value';
import Output, { DefaultStyle } from '@output/Output/Output';
import { toText } from '@output/Output/Phrase';
import { DefinitePose } from '@output/animation/Pose';
import type RenderContext from '@output/RenderContext';
import type { NameGenerator } from '@output/Output/Stage';
import { toBoolean, toNumber } from '@output/Output/Stage';
import { getOutputInputs } from '@output/Output/Valued';
import type Track from '@output/Music/Track';
import { toSemitones, toTrack } from '@output/Music/Track';
import { assignWords } from '@output/Music/articulate';
import {
    MaxTracks,
    clampBeats,
    clampGain,
    clampPan,
    clampTempo,
    type MusicData,
    type TrackData,
} from '@output/Music/musicData';
import { ScaleKeys, Scales } from '@output/Music/scales';

// Re-exported so existing importers keep working; defined in musicData so
// pure consumers can read it without importing this module.
export { MaxTracks } from '@output/Music/musicData';

export function createMusicType(locales: Locales) {
    // One `↑ <multilingual names>: [0semitones 2semitones …]` static bind per
    // named scale, the way Color names colors. Note that `scale`'s default
    // below forward-references `major`, declared later in this same block;
    // statics are resolved by property access at evaluation time, so this
    // works the same as referencing another structure's static.
    const scaleStatics = ScaleKeys.map((key) => {
        const bind = getBind(
            locales,
            (locale) => locale.output.Music.scales[key],
            `${SHARE_SYMBOL} `,
        );
        return `${bind}: [${Scales[key]
            .map((offset) => `${offset}semitones`)
            .join(' ')}]`;
    }).join('\n');

    // Music deliberately takes none of the standard style inputs (size, place,
    // color, background, selectable, the pose/animation slots, duration,
    // style). It has no appearance of its own to style: the viewer chooses the
    // visualization and it is anchored to the stage, so those inputs had no
    // mapping to the renderings we have and no obvious one to any we might add.
    // Creators who want music-driven visuals build them from @Beat, which gives
    // them every beat to drive whatever output they like.
    const definition = toStructure(`
    ${getBind(locales, (locale) => locale.output.Music, TYPE_SYMBOL)} Output(
        ${getBind(locales, (locale) => locale.output.Music.tracks)}•[🎶]|🎶
        ${getBind(locales, (locale) => locale.output.Music.tempo)}•#beats/min: 120beats/min
        ${getBind(locales, (locale) => locale.output.Music.key)}•#semitones: 0semitones
        ${getBind(locales, (locale) => locale.output.Music.scale)}•[#semitones]: 🎼.major
        ${getBind(locales, (locale) => locale.output.Music.volume)}•%: 100%
        ${getBind(locales, (locale) => locale.output.Music.replay)}•?: ⊥
        ${getBind(locales, (locale) => locale.output.Music.pause)}•?: ⊥
        ${getBind(locales, (locale) => locale.output.Music.name)}•""|ø: ø
        ${getBind(locales, (locale) => locale.output.Music.description)}•""|ø: ø
    ) (
        ${scaleStatics}
    )`);

    // Populate the scale statics directly; Music is a basis structure, so its
    // `↑` binds are never compiled (the Color staticBuilder pattern).
    definition.staticBuilder = (
        evaluator: Evaluator,
        def: StructureDefinition,
    ): Map<Bind, Value> => {
        const map = new Map<Bind, Value>();
        const context = evaluator.project.getContext(
            evaluator.project.getMain(),
        );
        for (const bind of def.getStaticBindsWithValues(context)) {
            const names = bind.names.getNames();
            const key = ScaleKeys.find((candidate) =>
                names.includes(candidate),
            );
            if (key === undefined) continue;
            map.set(
                bind,
                new ListValue(
                    bind,
                    Scales[key].map(
                        (offset) =>
                            new NumberValue(
                                bind,
                                new Decimal(offset),
                                Unit.reuse(['semitones']),
                            ),
                    ),
                ),
            );
        }
        return map;
    };

    return definition;
}

export default class Music extends Output {
    readonly tracks: readonly Track[];
    /** Beats per minute. */
    readonly tempo: number;
    /** Semitones to shift everything. */
    readonly key: number;
    /** Semitone offsets degrees resolve against. */
    readonly scale: readonly number[];
    /** 0-1 gain multiplier. */
    readonly volume: number;
    /** True on an evaluation restarts playback from the top. */
    readonly replay: boolean;
    /** While true, playback is frozen where it is and picks up there again. */
    readonly pause: boolean;

    private _description: string | undefined = undefined;

    constructor(
        value: Value,
        tracks: readonly Track[],
        tempo: number,
        key: number,
        scale: readonly number[],
        volume: number,
        replay: boolean,
        pause: boolean,
        name: TextValue | string,
        description: TextValue | undefined,
    ) {
        // Everything Output styles, Music leaves at its inert default: it has
        // no layout footprint and no appearance of its own to pose or animate.
        super(
            value,
            undefined,
            undefined,
            undefined,
            name,
            description,
            false,
            undefined,
            new DefinitePose(
                value,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
            ),
            undefined,
            undefined,
            undefined,
            undefined,
            0,
            DefaultStyle,
        );

        this.tracks = tracks;
        this.tempo = tempo;
        this.key = key;
        this.scale = scale;
        this.volume = volume;
        this.replay = replay;
        this.pause = pause;
    }

    /** The plain-data boundary for the player: resolve per-track overrides
     * and per-note defaults, clamp everything, and drop the Values, so the
     * pure transport/schedule/reconcile modules never see them. */
    toData(): MusicData {
        return {
            name: this.getName(),
            tempo: clampTempo(this.tempo),
            volume: clampGain(this.volume),
            key: this.key,
            scale: this.scale,
            replay: this.replay,
            pause: this.pause,
            description: this.description?.text,
            tracks: this.tracks.map((track): TrackData => {
                // Syllables are handed out across the whole track at once —
                // rests are skipped and a melisma spans several notes — so it
                // happens here, where the track is whole, rather than in the
                // scheduler, which sees one note at a time.
                const words = assignWords(track.words, track.notes);
                return {
                    notes: track.notes.map((note, index) => ({
                        degrees: note.degrees,
                        beats: clampBeats(note.beats ?? track.beat),
                        volume: clampGain(note.volume ?? 1),
                        words: words[index],
                    })),
                    instrument: track.instrument.id,
                    scale: track.scale ?? this.scale,
                    key: track.key ?? this.key,
                    volume: clampGain(track.volume),
                    pan: clampPan(track.pan),
                    loop: track.loop,
                    mash: track.mash,
                };
            }),
        };
    }

    /** The distinct instruments playing, in first-appearance order — the
     * clusters of the orchestra rendering. */
    getInstruments(): string[] {
        const ids: string[] = [];
        for (const track of this.tracks) {
            const id = track.instrument.id;
            if (!ids.includes(id)) ids.push(id);
        }
        return ids;
    }

    getLayout(_context: RenderContext) {
        // Music takes no room in the layout, the way Say doesn't: its
        // visualization is anchored to the floor of the stage rather than
        // flowing with the content, so putting a Music in a Row must not
        // shove the phrases beside it sideways.
        return {
            output: this,
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            width: 0,
            height: 0,
            ascent: 0,
            descent: 0,
            places: [],
            // A leaf has nothing of its own to report: its z lives in the place its
            // parent gave it, and Infinity loses every Math.min on the way up.
            nearest: Infinity,
        };
    }

    occupiesSpace() {
        return false;
    }

    getOutput() {
        return [];
    }

    getBackground(): undefined {
        // Music has no background of its own; the light show tints the stage's.
        return undefined;
    }

    getShortDescription(locales: Locales) {
        return this.getDescription(locales);
    }

    getDescription(locales: Locales) {
        if (this._description === undefined) {
            this._description = locales
                .concretize((l) => l.output.Music.defaultDescription, {
                    tracks: this.tracks.length,
                    tempo: this.tempo,
                })
                .toText()
                .trim();
        }
        return this._description;
    }

    getRepresentativeText() {
        return '🎼';
    }

    getEntryAnimated(): Output[] {
        return this.entering !== undefined ? [this] : [];
    }

    isEmpty() {
        // Nothing to lay out, like Say.
        return true;
    }

    find() {
        return undefined;
    }

    gatherFaces(set: Set<import('@basis/faces/Fonts').SupportedFace>) {
        return set;
    }
}

export function toMusic(
    project: Project,
    value: Value | undefined,
    namer: NameGenerator,
): Music | undefined {
    if (!(
        value instanceof StructureValue &&
        value.type === project.shares.output.Music
    ))
        return undefined;

    const [
        tracksVal,
        tempoVal,
        keyVal,
        scaleVal,
        volumeVal,
        replayVal,
        pauseVal,
        nameVal,
        descriptionVal,
    ] = getOutputInputs(value);

    // One track, or several played together, capped at MaxTracks.
    let tracks: Track[];
    if (tracksVal instanceof ListValue) {
        tracks = [];
        for (const trackVal of tracksVal.values.slice(0, MaxTracks)) {
            const track = toTrack(project, trackVal);
            if (track === undefined) return undefined;
            tracks.push(track);
        }
    } else {
        const track = toTrack(project, tracksVal);
        if (track === undefined) return undefined;
        tracks = [track];
    }

    const tempo = toNumber(tempoVal);
    const key = toNumber(keyVal);
    const scale = toSemitones(scaleVal);
    const volume = toNumber(volumeVal);
    const replay = toBoolean(replayVal);
    const pause = toBoolean(pauseVal);

    const name = toText(nameVal);
    const description = toText(descriptionVal);

    return tempo !== undefined &&
        key !== undefined &&
        scale !== undefined &&
        volume !== undefined &&
        replay !== undefined &&
        pause !== undefined
        ? new Music(
              value,
              tracks,
              tempo,
              key,
              scale,
              volume,
              replay,
              pause,
              namer.getName(name?.text, value),
              description,
          )
        : undefined;
}
