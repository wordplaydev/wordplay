import Setting from '@db/settings/Setting';

/**
 * Whether to sound a short earcon each time the program re-evaluates, naming
 * the stream that caused it (#537) — the auditory counterpart of the editor's
 * visual "pop" on a reacting stream.
 *
 * Off by default, and device-specific like the other audio settings: cues are
 * heard by whoever is at this device, and a creator who has not asked for a
 * sound on every keypress should not get one.
 */
export const CuesSetting = new Setting<boolean>(
    'cues',
    true,
    false,
    (value) => (typeof value === 'boolean' ? value : false),
    (current, value) => current === value,
);

/**
 * Whether an animation is audible too: a cue as each pose is reached, a
 * downbeat each time a sequence comes round, and a cue when it starts, moves,
 * or leaves.
 *
 * Its own switch rather than part of `cues`, because animation is far denser
 * than the other sources — a looping sequence sounds continuously, where a
 * keypress or a landing is an event — and someone may well want the sparse cues
 * without a stage that sings. Off by default, like the rest.
 */
export const AnimationCuesSetting = new Setting<boolean>(
    'animationCues',
    true,
    false,
    (value) => (typeof value === 'boolean' ? value : false),
    (current, value) => current === value,
);

/**
 * Whether a physics contact is audible.
 *
 * Its own switch rather than part of `cues`, because a contact is not a
 * re-evaluation — it sounds whether or not the program evaluates `Collision()`
 * — and because it is the second-densest source: a landing is twenty cues in a
 * second where a keypress is one. Off by default, like the rest.
 */
export const ContactCuesSetting = new Setting<boolean>(
    'contactCues',
    true,
    false,
    (value) => (typeof value === 'boolean' ? value : false),
    (current, value) => current === value,
);
