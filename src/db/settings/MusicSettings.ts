import Setting from '@db/settings/Setting';

/**
 * How a viewer sees music. Choosing a rendering is purely the viewer's: a
 * creator can build their own visuals from `Beat()`, but they can never take
 * a rendering away, and the viewer can always switch or turn it off.
 */
export type MusicVisualization =
    'orchestra' | 'lightshow' | 'mood' | 'sheet' | 'off';

/** The chooser's order, and the order every parallel array below and every
 * locale `labels`/`tips` tuple must match. */
export const MusicVisualizations: MusicVisualization[] = [
    'orchestra',
    'lightshow',
    'mood',
    'sheet',
    'off',
];

/** Icons for the stage toolbar's chooser, in `MusicVisualizations` order. */
export const MusicVisualizationIcons = ['🎻', '💡', '🌀', '🎼', '⬛'];

/**
 * Whether a rendering may be drawn over by the stage's floor band — the `Say`
 * caption and the on-screen key pad.
 *
 * A rendering that carries readable marks is ruined by text sitting on it, so
 * those get a floor and the band stands above it. A rendering that is a wash of
 * colour is not: it is background by construction, and holding a band of stage
 * empty above it would cost the creator real room for nothing. Height is not
 * the question — the mood cloud is the tallest and the safest to cover.
 *
 * `needs` names the count each rendering's own `{#if}` gates on, so a floor is
 * only held when the thing standing on it is actually drawn. They differ:
 * `MusicView` gates on one bar per *track*, while `Sheet` draws its staff for
 * any `Music` at all. Getting this wrong is invisible — the band simply floats
 * above nothing.
 *
 * Total by `Record`, so a new rendering is a type error until it says which
 * kind it is.
 */
export type MusicFloorRule =
    | { overlap: 'allowed' }
    | { overlap: 'forbidden'; height: string; needs: 'musics' | 'tracks' };

export const MusicVisualizationFloor: Record<
    MusicVisualization,
    MusicFloorRule
> = {
    /** Instrument columns whose labels are meant to be read across a room. */
    orchestra: {
        overlap: 'forbidden',
        height: 'var(--music-orchestra-height)',
        needs: 'tracks',
    },
    /** A staff carrying noteheads and lyrics — notation, unreadable under text. */
    sheet: {
        overlap: 'forbidden',
        height: 'var(--music-sheet-height)',
        needs: 'musics',
    },
    /** A blurred tint over the whole stage; there is no band to stand above. */
    lightshow: { overlap: 'allowed' },
    /** Blurred and masked to transparent by design, so being drawn over is what
     *  it is for; holding 42% of the stage empty above it was the mistake. */
    mood: { overlap: 'allowed' },
    /** Nothing is drawn, so nothing can be drawn over. */
    off: { overlap: 'allowed' },
};

/**
 * The CSS length the floor band stands on, given what is actually on stage. A
 * string rather than a number because the heights are tokens declared beside
 * the renderings that use them; one copy, not two.
 */
export function musicFloorHeight(
    visualization: MusicVisualization,
    stage: { musics: number; tracks: number },
): string {
    const rule = MusicVisualizationFloor[visualization];
    if (rule.overlap === 'allowed') return '0%';
    return (rule.needs === 'tracks' ? stage.tracks : stage.musics) > 0
        ? rule.height
        : '0%';
}

/** Narrow a string from the chooser back to a visualization. Anything stored
 * from an older release that no longer names a mode falls back, so adding or
 * removing one never needs a migration. */
export function toMusicVisualization(value: string): MusicVisualization {
    return isVisualization(value) ? value : 'orchestra';
}

function isVisualization(value: unknown): value is MusicVisualization {
    return MusicVisualizations.some((candidate) => candidate === value);
}

export const MusicVisualizationSetting = new Setting<MusicVisualization>(
    'musicVisualization',
    true,
    'orchestra',
    (value) => (isVisualization(value) ? value : 'orchestra'),
    (current, value) => current === value,
);

/** A 0-1 gain multiplier on all music, so a viewer can quiet or mute it. */
export const MusicVolumeSetting = new Setting<number>(
    'musicVolume',
    true,
    1,
    (value) =>
        typeof value === 'number' && Number.isFinite(value)
            ? Math.min(1, Math.max(0, value))
            : 1,
    (current, value) => current === value,
);

/**
 * How far music ducks while the screen reader or `Say` is speaking. The
 * ducking itself is not optional — a blind creator should never have to
 * choose between hearing their program and hearing their screen reader — but
 * how deep it goes is the viewer's. The default is the 20% a blind
 * collaborator asked for.
 */
export const MusicDuckingSetting = new Setting<number>(
    'musicDucking',
    true,
    0.2,
    (value) =>
        typeof value === 'number' && Number.isFinite(value)
            ? Math.min(1, Math.max(0, value))
            : 0.2,
    (current, value) => current === value,
);

/**
 * Whether to vibrate on the beat where the device supports it. On by
 * default: collaborators asked for it twice, once as a hard requirement for
 * devices that cannot show visuals.
 */
export const HapticsSetting = new Setting<boolean>(
    'haptics',
    true,
    true,
    (value) => (typeof value === 'boolean' ? value : true),
    (current, value) => current === value,
);
