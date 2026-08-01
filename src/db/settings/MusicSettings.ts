import Setting from '@db/settings/Setting';

/**
 * How a viewer sees music. Choosing a rendering is purely the viewer's: a
 * creator can build their own visuals from `Beat()`, but they can never take
 * a rendering away, and the viewer can always switch or turn it off.
 */
export type MusicVisualization = 'orchestra' | 'lightshow' | 'off';

export const MusicVisualizations: MusicVisualization[] = [
    'orchestra',
    'lightshow',
    'off',
];

/** Icons for the stage toolbar's chooser, in `MusicVisualizations` order. */
export const MusicVisualizationIcons = ['🎻', '💡', '⬛'];

/** Narrow a string from the chooser back to a visualization. */
export function toMusicVisualization(value: string): MusicVisualization {
    return isVisualization(value) ? value : 'orchestra';
}

function isVisualization(value: unknown): value is MusicVisualization {
    return (
        value === 'orchestra' || value === 'lightshow' || value === 'off'
    );
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
