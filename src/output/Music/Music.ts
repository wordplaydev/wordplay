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
import type Color from '@output/Color/Color';
import { toColor } from '@output/Color/Color';
import Output, { DefaultStyle } from '@output/Output/Output';
import { toText } from '@output/Output/Phrase';
import type Place from '@output/Place/Place';
import { toPlace } from '@output/Place/Place';
import type Pose from '@output/animation/Pose';
import { DefinitePose, toPose } from '@output/animation/Pose';
import type RenderContext from '@output/RenderContext';
import type Sequence from '@output/animation/Sequence';
import { toSequence } from '@output/animation/Sequence';
import type { NameGenerator } from '@output/Output/Stage';
import { toBoolean, toNumber } from '@output/Output/Stage';
import { getOutputInputs } from '@output/Output/Valued';
import type Track from '@output/Music/Track';
import { toSemitones, toTrack } from '@output/Music/Track';
import {
    clampBeats,
    clampGain,
    clampPan,
    clampTempo,
    type MusicData,
    type TrackData,
} from '@output/Music/musicData';
import { ScaleKeys, Scales } from '@output/Music/scales';

/** The hard ceiling on tracks, chosen for scheduling and listener limits. */
export const MaxTracks = 128;

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

    // Music takes the standard style inputs except the pose shorthands
    // (opacity, offset, rotation, scale, flipx, flipy): the musical `scale`
    // input claims that name, and one structure cannot bind it twice. Those
    // properties remain reachable through a Pose in resting/entering/etc.
    const definition = toStructure(`
    ${getBind(locales, (locale) => locale.output.Music, TYPE_SYMBOL)} Output(
        ${getBind(locales, (locale) => locale.output.Music.tracks)}•[🎶]|🎶
        ${getBind(locales, (locale) => locale.output.Music.tempo)}•#beats/min: 120beats/min
        ${getBind(locales, (locale) => locale.output.Music.key)}•#semitones: 0semitones
        ${getBind(locales, (locale) => locale.output.Music.scale)}•[#semitones]: 🎼.major
        ${getBind(locales, (locale) => locale.output.Music.volume)}•%: 100%
        ${getBind(locales, (locale) => locale.output.Music.replay)}•?: ⊥
        ${getBind(locales, (locale) => locale.output.Music.size)}•${'#m|ø: ø'}
        ${getBind(locales, (locale) => locale.output.Music.place)}•📍|ø: ø
        ${getBind(locales, (locale) => locale.output.Music.name)}•""|ø: ø
        ${getBind(locales, (locale) => locale.output.Music.description)}•""|ø: ø
        ${getBind(locales, (locale) => locale.output.Music.selectable)}•?: ⊥
        ${getBind(locales, (locale) => locale.output.Music.color)}•🌈${'|ø: ø'}
        ${getBind(locales, (locale) => locale.output.Music.background)}•Color${'|ø: ø'}
        ${getBind(locales, (locale) => locale.output.Music.entering)}•ø|🤪|💃: ø
        ${getBind(locales, (locale) => locale.output.Music.resting)}•ø|🤪|💃: ø
        ${getBind(locales, (locale) => locale.output.Music.moving)}•ø|🤪|💃: ø
        ${getBind(locales, (locale) => locale.output.Music.exiting)}•ø|🤪|💃: ø
        ${getBind(locales, (locale) => locale.output.Music.duration)}•#s: 0.25s
        ${getBind(locales, (locale) => locale.output.Music.style)}•${locales
            .getLocales()
            .map((locale) =>
                Object.values(locale.output.Easing).map(
                    (id) => `"${id}"/${locale.language}`,
                ),
            )
            .flat()
            .join('|')}: "${DefaultStyle}"
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

    private _description: string | undefined = undefined;

    constructor(
        value: Value,
        tracks: readonly Track[],
        tempo: number,
        key: number,
        scale: readonly number[],
        volume: number,
        replay: boolean,
        size: number | undefined,
        place: Place | undefined,
        name: TextValue | string,
        description: TextValue | undefined,
        selectable: boolean,
        background: Color | undefined,
        pose: DefinitePose,
        entering: Pose | Sequence | undefined,
        resting: Pose | Sequence | undefined,
        moving: Pose | Sequence | undefined,
        exiting: Pose | Sequence | undefined,
        duration: number,
        style: string,
    ) {
        super(
            value,
            size,
            undefined,
            place,
            name,
            description,
            selectable,
            background,
            pose,
            entering,
            resting,
            moving,
            exiting,
            duration,
            style,
        );

        this.tracks = tracks;
        this.tempo = tempo;
        this.key = key;
        this.scale = scale;
        this.volume = volume;
        this.replay = replay;
    }

    /** The plain-data boundary for the player: resolve per-track overrides
     * and per-note defaults, clamp everything, and drop the Values, so the
     * pure transport/schedule/reconcile modules never see them. */
    toData(): MusicData {
        return {
            name: this.getName(),
            tempo: clampTempo(this.tempo),
            volume: clampGain(this.volume),
            replay: this.replay,
            description: this.description?.text,
            tracks: this.tracks.map(
                (track): TrackData => ({
                    notes: track.notes.map((note) => ({
                        degrees: note.degrees,
                        beats: clampBeats(note.beats ?? track.beat),
                        volume: clampGain(note.volume ?? 1),
                    })),
                    instrument: track.instrument.id,
                    scale: track.scale ?? this.scale,
                    key: track.key ?? this.key,
                    volume: clampGain(track.volume),
                    pan: clampPan(track.pan),
                    loop: track.loop,
                }),
            ),
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
        // The orchestra rendering's footprint: one column per instrument
        // cluster, side by side.
        const clusters = Math.max(1, this.getInstruments().length);
        const width = this.size ?? Math.max(2, clusters * 1.25);
        const height = this.size ?? 3;
        return {
            output: this,
            left: 0,
            right: width,
            top: height,
            bottom: 0,
            width,
            height,
            ascent: height,
            descent: 0,
            places: [],
        };
    }

    getOutput() {
        return [];
    }

    getBackground(): Color | undefined {
        return this.background;
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
        return this.tracks.length === 0;
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
    if (
        !(
            value instanceof StructureValue &&
            value.type === project.shares.output.Music
        )
    )
        return undefined;

    const [
        tracksVal,
        tempoVal,
        keyVal,
        scaleVal,
        volumeVal,
        replayVal,
        sizeVal,
        placeVal,
        nameVal,
        descriptionVal,
        selectableVal,
        colorVal,
        backgroundVal,
        enteringVal,
        restingVal,
        movingVal,
        exitingVal,
        durationVal,
        styleVal,
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

    const size = toNumber(sizeVal);
    const place = toPlace(placeVal);
    const name = toText(nameVal);
    const description = toText(descriptionVal);
    const selectable = toBoolean(selectableVal);
    const color = toColor(colorVal);
    const background = toColor(backgroundVal);
    // Music omits the pose shorthand inputs (see createMusicType), so the
    // pose carries only color; the rest come from a Pose in the animation
    // slots.
    const pose = new DefinitePose(
        value,
        color,
        undefined,
        undefined,
        place?.rotation,
        undefined,
        undefined,
        undefined,
    );
    const entering =
        toPose(project, enteringVal) ?? toSequence(project, enteringVal);
    const resting =
        toPose(project, restingVal) ?? toSequence(project, restingVal);
    const moving = toPose(project, movingVal) ?? toSequence(project, movingVal);
    const exiting =
        toPose(project, exitingVal) ?? toSequence(project, exitingVal);
    const duration = toNumber(durationVal);
    const style = toText(styleVal)?.text;

    return tempo !== undefined &&
        key !== undefined &&
        scale !== undefined &&
        volume !== undefined &&
        replay !== undefined &&
        selectable !== undefined &&
        duration !== undefined &&
        style !== undefined
        ? new Music(
              value,
              tracks,
              tempo,
              key,
              scale,
              volume,
              replay,
              size,
              place,
              namer.getName(name?.text, value),
              description,
              selectable,
              background,
              pose,
              entering,
              resting,
              moving,
              exiting,
              duration,
              style,
          )
        : undefined;
}
