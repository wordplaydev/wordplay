import { DB, Settings } from '@db/Database';
import type Setting from '@db/settings/Setting';
import type { ToursTaken } from '@db/settings/ToursSetting';
import { expect, test } from 'vitest';

/**
 * The cloud badge in the settings UI reads `Setting.device` to decide whether a
 * setting follows the creator's account. That flag only controls whether a
 * change calls `uploadSettings()`, though — what actually reaches Firestore is
 * `toObject()`. The two drifted apart once already: `face`, `lines`, `wrap`, and
 * `space` were flagged `device: false`, paid for a full creator-doc write on
 * every change, and were serialized nowhere. Now that visible UI claims the flag
 * is true, keep it true.
 */

/**
 * A setting paired with a value distinguishable from its default, so we can
 * prove `toObject()` actually carries that setting rather than happening to
 * match. The pairing is built at the setting's own type, so a probe that isn't
 * a value the setting could hold is a compile error; the type is then erased so
 * the list can be walked without every entry having to agree on one value type.
 */
type Probe = {
    key: string;
    value: unknown;
    /** The setting's value right now. */
    current(): unknown;
    /** Writes the probe, returning a function that puts the old value back. */
    apply(): () => void;
};

function probe<Type>(key: string, setting: Setting<Type>, value: Type): Probe {
    return {
        key,
        value,
        current: () => setting.get(),
        apply() {
            const original = setting.get();
            setting.set(DB, value);
            return () => setting.set(DB, original);
        },
    };
}

/** Keyed by the settings-record key, not the Firestore field name: two of those
 *  differ (`howToNotifications` → `newHowToNotifications`), so a name-based
 *  check would need a mapping to keep in step with the schema. */
const Probes: Probe[] = [
    probe('animationFactor', Settings.settings.animationFactor, 0.25),
    probe('locales', Settings.settings.locales, ['es-MX']),
    probe('tutorial', Settings.settings.tutorial, {
        mode: 'quick',
        progress: {},
    }),
    probe('writingLayout', Settings.settings.writingLayout, 'vertical-rl'),
    probe('howToNotifications', Settings.settings.howToNotifications, false),
    probe('projectFolders', Settings.settings.projectFolders, {
        probe: { name: 'probe', collapsed: true },
    }),
    probe('projectSort', Settings.settings.projectSort, 'edited'),
    probe<ToursTaken>('tours', Settings.settings.tours, ['palette']),
    probe('chatThreads', Settings.settings.chatThreads, { probe: { root: 3 } }),
    probe('emailNotifications', Settings.settings.emailNotifications, {
        decisions: false,
        reviews: false,
        activity: true,
    }),
    probe('face', Settings.settings.face, 'Noto Sans Mono'),
    probe('lines', Settings.settings.lines, false),
    probe('wrap', Settings.settings.wrap, false),
    probe('space', Settings.settings.space, true),
];

/** The settings that claim to follow the creator's account. */
function syncedEntries() {
    return Object.entries(Settings.settings).filter(
        ([, setting]) => !setting.device,
    );
}

test('every setting flagged as synced has a probe value here', () => {
    // Not busywork: a new synced setting that isn't listed above would otherwise
    // skip the round-trip check below, which is exactly the gap this file exists
    // to close.
    expect(
        syncedEntries()
            .map(([key]) => key)
            .sort(),
    ).toEqual(Probes.map(({ key }) => key).sort());
});

test('every setting flagged as synced is actually serialized', () => {
    for (const { key, value, current, apply } of Probes) {
        expect(
            value,
            `${key}'s probe must differ from its current value`,
        ).not.toEqual(current());
        // The store is a module-level singleton, so restore it below however
        // the assertion goes; a leaked probe would change other suites.
        const restore = apply();
        try {
            expect(
                Object.values(Settings.toObject()),
                `${key} is device: false but toObject() never writes it`,
            ).toContainEqual(value);
        } finally {
            restore();
        }
    }
});

test('the schema writes nothing beyond the synced settings', () => {
    // Catches the opposite drift: a field serialized to the creator document
    // whose setting is flagged device-specific, and so is never uploaded when
    // it changes. `v` is the schema version, not a setting.
    const fields = Object.keys(Settings.toObject()).filter(
        (key) => key !== 'v',
    );
    expect(fields.length).toBe(syncedEntries().length);
});

test('each cue source has its own switch, and none is a master', () => {
    // A row that means anything other than what its label says reads as broken,
    // so turning one off must leave the others alone.
    for (const key of ['cues', 'contactCues', 'animationCues'] as const) {
        const setting = Settings.settings[key];
        expect(setting.defaultValue, key).toBe(false);
        expect(setting.device, key).toBe(true);
    }
});

test('animation cues are their own switch, also off', () => {
    // Separate from `cues` because animation sounds continuously where the
    // other sources sound on an event: someone may want the sparse cues
    // without a stage that sings.
    const setting = Settings.settings.animationCues;
    expect(setting.defaultValue).toBe(false);
    expect(setting.device).toBe(true);
    const original = setting.get();
    try {
        Settings.setAnimationCues(true);
        expect(Settings.getAnimationCues()).toBe(true);
        // And it is genuinely independent of the cues switch.
        expect(Settings.settings.cues.get()).toBe(
            Settings.settings.cues.defaultValue,
        );
    } finally {
        setting.set(DB, original);
    }
});

test('evaluation cues are off until asked for', () => {
    // A creator who hasn't asked for a sound on every keypress must not get
    // one, and cues are heard at a device rather than by an account, so the
    // setting stays device-specific like the other audio settings.
    const setting = Settings.settings.cues;
    expect(setting.defaultValue).toBe(false);
    expect(setting.device).toBe(true);
    const original = setting.get();
    try {
        Settings.setCues(true);
        expect(Settings.getCues()).toBe(true);
        Settings.setCues(false);
        expect(Settings.getCues()).toBe(false);
    } finally {
        setting.set(DB, original);
    }
});
