/**
 * The palette controls for a `Music` and for one of its `Track`s.
 *
 * `Music` deliberately takes none of the standard style inputs — it has no
 * appearance of its own to pose, place, or colour — so this is its own list
 * rather than the shared `getTypeOutputProperties` base every visible output
 * builds on.
 *
 * `tracks` and `notes` are absent on purpose: the sheet editor edits those by
 * direct manipulation, and a list-of-structures control beside it would be a
 * second, worse way to do the same thing.
 */

import type Project from '@db/projects/Project';
import type Locales from '@locale/Locales';
import BooleanLiteral from '@nodes/BooleanLiteral';
import type Expression from '@nodes/Expression';
import NoneLiteral from '@nodes/NoneLiteral';
import NumberLiteral from '@nodes/NumberLiteral';
import PropertyReference from '@nodes/PropertyReference';
import Reference from '@nodes/Reference';
import TextLiteral from '@nodes/TextLiteral';
import Unit from '@nodes/Unit';
import OutputProperty from '@edit/output/OutputProperty';
import OutputPropertyOptions from '@edit/output/OutputPropertyOptions';
import OutputPropertyRange from '@edit/output/OutputPropertyRange';
import OutputPropertyText from '@edit/output/OutputPropertyText';
import { MinTempo } from '@output/Music/musicData';
import { ScaleKeys, type ScaleKey } from '@output/Music/scales';
import { InstrumentKeys } from '@output/Music/instruments';

const Semitones = () => Unit.create(['semitones']);
const Beats = () => Unit.create(['beats']);

/**
 * A dropdown over a structure's named statics — `🎼.major`, `🔈.piano`.
 *
 * The option *values* are the en-US keys, because they index the palette
 * tables; the *labels* come from the definition's own names via
 * `locales.getName`, never from UI text, so a localized name is the one the
 * creator would type. The expression written back is a property reference to
 * the static, which is what a creator writes by hand.
 */
function staticOptions(
    project: Project,
    locales: Locales,
    owner: 'Music' | 'Instrument',
    keys: readonly string[],
    fallback: string,
): OutputPropertyOptions {
    const definition =
        owner === 'Music'
            ? project.shares.output.Music
            : project.shares.output.Instrument;
    const context = project.getContext(project.getMain());
    const binds = definition.getStaticBindsWithValues(context);

    /** The bind whose names include this en-US key. */
    const bindFor = (key: string) =>
        binds.find((bind) => bind.names.getNames().includes(key));

    const reference = (key: string): Expression | undefined => {
        const bind = bindFor(key);
        return bind === undefined
            ? undefined
            : PropertyReference.make(
                  definition.getReference(locales),
                  Reference.make(locales.getName(bind.names)),
              );
    };

    return new OutputPropertyOptions(
        keys.map((key) => {
            const bind = bindFor(key);
            return {
                value: key,
                label: bind === undefined ? key : locales.getName(bind.names),
            };
        }),
        false,
        (text) => reference(text),
        (expression) => {
            if (!(expression instanceof PropertyReference)) return fallback;
            const name = expression.name?.getName();
            if (name === undefined) return fallback;
            const match = keys.find((key) => bindFor(key)?.names.hasName(name));
            return match ?? fallback;
        },
    );
}

/**
 * The editable inputs of a `Music`, in the order they are shown.
 *
 * Name first because it is what identifies this music among a project's
 * several — to `Beat`'s name filter, and to the editor's own music chooser —
 * then description, which is what a screen reader announces when the music
 * plays, and so belongs where it will be noticed rather than at the bottom
 * where it reads as an afterthought. Tempo follows as the property a creator
 * reaches for most.
 *
 * **Nothing here is `required`.** Every one of these inputs has a declared
 * default in the structure, and `required` changes what reverting means: it
 * writes the default *literal* back instead of removing the input, so the ✗
 * button appears to do nothing to the code.
 *
 * **`pause` and `replay` are deliberately absent.** Both are momentary or
 * lasting *signals*, useful only as expressions, and the palette can only
 * write a literal. `replay`'s own doc warns that a condition which stays true
 * "would restart me on every evaluation from then on" — which is exactly and
 * only what a checkbox can say, so its single non-default state is the
 * documented mistake. `pause: ⊤` is at least coherent, but it writes a
 * permanent edit that reads like a temporary mute; muting while composing
 * belongs to the editor's own playback, which doesn't touch the program.
 */
export function getMusicProperties(
    project: Project,
    locales: Locales,
): OutputProperty[] {
    return [
        new OutputProperty(
            (l) => l.output.Music.name.names,
            new OutputPropertyText(() => true),
            false,
            false,
            (expr) => expr instanceof TextLiteral,
            () => TextLiteral.make(''),
        ),
        new OutputProperty(
            (l) => l.output.Music.description.names,
            new OutputPropertyText(() => true),
            false,
            false,
            (expr) => expr instanceof TextLiteral,
            () => TextLiteral.make(''),
        ),
        new OutputProperty(
            (l) => l.output.Music.tempo.names,
            new OutputPropertyRange(MinTempo, 240, 1, 'beats/min', 0),
            // Bounded well below MaxTempo: 960bpm is legal but is sixteen
            // beats a second, so a slider that reached it would make every
            // musical tempo a pixel wide.
            false,
            false,
            (expr) => expr instanceof NumberLiteral,
            () => NumberLiteral.make(120, Unit.create(['beats'], ['min'])),
        ),
        new OutputProperty(
            (l) => l.output.Music.scale.names,
            staticOptions(project, locales, 'Music', ScaleKeys, 'major'),
            false,
            false,
            (expr) => expr instanceof PropertyReference,
            () =>
                staticReference(project, locales, 'Music', 'major') ??
                NoneLiteral.make(),
        ),
        new OutputProperty(
            (l) => l.output.Music.key.names,
            new OutputPropertyRange(-12, 12, 1, 'semitones', 0),
            false,
            false,
            (expr) => expr instanceof NumberLiteral,
            () => NumberLiteral.make(0, Semitones()),
        ),
        new OutputProperty(
            (l) => l.output.Music.volume.names,
            new OutputPropertyRange(0, 1, 0.01, '%', 0),
            false,
            false,
            (expr) => expr instanceof NumberLiteral,
            () => NumberLiteral.make('100%'),
        ),
    ];
}

/** The editable inputs of one `Track`, shown beneath the sheet. */
export function getTrackProperties(
    project: Project,
    locales: Locales,
): OutputProperty[] {
    return [
        new OutputProperty(
            (l) => l.output.Track.instrument.names,
            staticOptions(
                project,
                locales,
                'Instrument',
                InstrumentKeys,
                'piano',
            ),
            false,
            false,
            (expr) => expr instanceof PropertyReference,
            () =>
                staticReference(project, locales, 'Instrument', 'piano') ??
                NoneLiteral.make(),
        ),
        new OutputProperty(
            (l) => l.output.Track.beat.names,
            new OutputPropertyRange(0.125, 4, 0.125, 'beats', 3),
            false,
            false,
            (expr) => expr instanceof NumberLiteral,
            () => NumberLiteral.make(1, Beats()),
        ),
        new OutputProperty(
            (l) => l.output.Track.volume.names,
            new OutputPropertyRange(0, 1, 0.01, '%', 0),
            false,
            false,
            (expr) => expr instanceof NumberLiteral,
            () => NumberLiteral.make('100%'),
        ),
        new OutputProperty(
            (l) => l.output.Track.pan.names,
            new OutputPropertyRange(-1, 1, 0.1, '', 1),
            false,
            false,
            (expr) => expr instanceof NumberLiteral,
            () => NumberLiteral.make(0),
        ),
        new OutputProperty(
            (l) => l.output.Track.loop.names,
            'bool',
            false,
            false,
            (expr) => expr instanceof BooleanLiteral,
            () => BooleanLiteral.make(true),
        ),
        new OutputProperty(
            (l) => l.output.Track.mash.names,
            'bool',
            false,
            false,
            (expr) => expr instanceof BooleanLiteral,
            () => BooleanLiteral.make(true),
        ),
        // scale and key are per-track overrides of the music's, so they read
        // as `…|ø` and are left to the music's controls until a track needs
        // its own — a dropdown that silently pinned every track to a scale
        // would be worse than not offering one.
    ];
}

/** A property reference to one of a structure's statics, for a default. */
function staticReference(
    project: Project,
    locales: Locales,
    owner: 'Music' | 'Instrument',
    key: string,
): Expression | undefined {
    const definition =
        owner === 'Music'
            ? project.shares.output.Music
            : project.shares.output.Instrument;
    const context = project.getContext(project.getMain());
    const bind = definition
        .getStaticBindsWithValues(context)
        .find((candidate) => candidate.names.getNames().includes(key));
    return bind === undefined
        ? undefined
        : PropertyReference.make(
              definition.getReference(locales),
              Reference.make(locales.getName(bind.names)),
          );
}

/** Narrow an arbitrary id to a scale key, for callers holding plain text. */
export function toScaleKey(id: string): ScaleKey | undefined {
    return ScaleKeys.find((key) => key === id);
}
