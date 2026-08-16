import DefaultLocale from '@locale/DefaultLocale';
import type LocaleText from '@locale/LocaleText';
import { type NameAndDoc } from '@locale/LocaleText';

/** The animations available as `↑` static functions on the `Sequence` structure. */
export type AnimationKey = keyof LocaleText['output']['Sequence']['animations'];

type Animations = LocaleText['output']['Sequence']['animations'];

/** One input of an animation, emitted before `Sequence`'s own inputs. */
type AnimationInput = {
    /** Where this input's name and doc live in the locale. */
    bind: (locale: LocaleText) => NameAndDoc;
    /** The input's Wordplay type, e.g. `#°`. */
    type: string;
    /** The input's Wordplay default value, e.g. `2°`. */
    value: string;
};

export type Animation = {
    key: AnimationKey;
    /** Where this animation's name and doc live in the locale. */
    bind: (locale: LocaleText) => NameAndDoc;
    inputs: AnimationInput[];
    /** Wordplay source for the `{%:Pose}` map to animate through. */
    poses: string;
};

/**
 * The one name of a definition guaranteed to resolve in every locale, for use in the
 * generated Wordplay source below. `getBind` always includes en-US's *first* name — as a
 * symbolic alias when en-US isn't among the selected locales — so `Pose` is `🤪` and
 * `duration` is `⏳`, even though a creator reading en-US sees the words.
 */
export function reference(select: (locale: LocaleText) => NameAndDoc): string {
    const names = select(DefaultLocale).names;
    return Array.isArray(names) ? names[0] : names;
}

/** Definitions the animation bodies below refer to. */
const Sequence = reference((l) => l.output.Sequence);
const Pose = reference((l) => l.output.Pose);
const Place = reference((l) => l.output.Place);
const Color = reference((l) => l.output.Color);

/** `Sequence`'s own inputs, which every animation takes after its own and passes along. */
export const SequenceInputs = {
    poses: reference((l) => l.output.Sequence.poses),
    duration: reference((l) => l.output.Sequence.duration),
    style: reference((l) => l.output.Sequence.style),
    count: reference((l) => l.output.Sequence.count),
    description: reference((l) => l.output.Sequence.description),
};

/** The body every animation compiles to: its poses, plus the inputs it passes through. */
export function animationBody(poses: string): string {
    const { duration, style, count, description } = SequenceInputs;
    return `${Sequence}(${poses} ${duration} ${style} ${count} ${description})`;
}

/**
 * Declare one animation. The generic ties each input's accessor to that animation's own
 * locale entry, so a typo in an input name is a compile error rather than a missing string.
 */
function animation<Key extends AnimationKey>(
    key: Key,
    inputs: {
        bind: (animation: Animations[Key]) => NameAndDoc;
        type: string;
        value: string;
    }[],
    poses: string,
): Animation {
    return {
        key,
        bind: (locale) => locale.output.Sequence.animations[key],
        inputs: inputs.map((input) => ({
            bind: (locale) =>
                input.bind(locale.output.Sequence.animations[key]),
            type: input.type,
            value: input.value,
        })),
        poses,
    };
}

/** Inputs are referenced by their en-US name, which resolves in every locale (see `reference`). */
const angle = (value: string) => [
    { bind: (a: { angle: NameAndDoc }) => a.angle, type: '#°', value },
];
const distance = (value: string) => [
    { bind: (a: { distance: NameAndDoc }) => a.distance, type: '#m', value },
];
const amount = (value: string, type = '#') => [
    { bind: (a: { amount: NameAndDoc }) => a.amount, type, value },
];

/**
 * Every predefined animation, in the order they appear in the docs browser and the palette's
 * preset list: everyday, attention, entrance, exit, ambient, color.
 */
export const Animations: Animation[] = [
    // --- Everyday ---
    animation(
        'sway',
        angle('2°'),
        `{
            0%: ${Pose}(rotation: -1 × angle)
            50%: ${Pose}(rotation: angle)
            100%: ${Pose}(rotation: -1 × angle)
        }`,
    ),
    animation(
        'bounce',
        [{ bind: (a) => a.height, type: '#m', value: '2m' }],
        `{
            0%: ${Pose}(scale: 1 offset: ${Place}(y: 0m))
            10%: ${Pose}(scale: 1.1 offset: ${Place}(y: height))
            30%: ${Pose}(scale: .9 offset: ${Place}(y: height))
            50%: ${Pose}(scale: 1 offset: ${Place}(y: 0m))
            57%: ${Pose}(scale: 1 offset: ${Place}(y: .1m))
            64%: ${Pose}(scale: 1 offset: ${Place}(y: 0m))
            100%: ${Pose}(scale: 1 offset: ${Place}(y: 0m))
        }`,
    ),
    animation(
        'spin',
        [],
        `{
            0%: ${Pose}(rotation: 360°)
            100%: ${Pose}(rotation: 0°)
        }`,
    ),
    animation(
        'fadein',
        [],
        `{
            0%: ${Pose}(opacity: 0%)
            100%: ${Pose}(opacity: 100%)
        }`,
    ),
    animation(
        'fadeout',
        [],
        `{
            0%: ${Pose}(opacity: 100%)
            100%: ${Pose}(opacity: 0%)
        }`,
    ),
    animation(
        'popup',
        [],
        `{
            0%: ${Pose}(scale: 0)
            80%: ${Pose}(scale: 1.1)
            90%: ${Pose}(scale: 0.9)
            100%: ${Pose}(scale: 1)
        }`,
    ),
    animation(
        'shake',
        [],
        `{
            0%: ${Pose}(offset: ${Place}(x: 0m y: 0m))
            25%: ${Pose}(offset: ${Place}(x: -.1m y: .1m))
            50%: ${Pose}(offset: ${Place}(x: .1m y: 0m))
            75%: ${Pose}(offset: ${Place}(x: -.1m y: .1m))
            100%: ${Pose}(offset: ${Place}(x: 0m y: 0m))
        }`,
    ),

    // --- Attention ---
    animation(
        'pulse',
        amount('1.1'),
        `{
            0%: ${Pose}(scale: 1)
            50%: ${Pose}(scale: amount)
            100%: ${Pose}(scale: 1)
        }`,
    ),
    animation(
        'heartbeat',
        amount('1.3'),
        `{
            0%: ${Pose}(scale: 1)
            14%: ${Pose}(scale: amount)
            28%: ${Pose}(scale: 1)
            42%: ${Pose}(scale: amount)
            70%: ${Pose}(scale: 1)
            100%: ${Pose}(scale: 1)
        }`,
    ),
    animation(
        'tada',
        amount('1.1'),
        `{
            0%: ${Pose}(scale: 1 rotation: 0°)
            10%: ${Pose}(scale: 0.9 rotation: -3°)
            20%: ${Pose}(scale: 0.9 rotation: -3°)
            30%: ${Pose}(scale: amount rotation: 3°)
            40%: ${Pose}(scale: amount rotation: -3°)
            50%: ${Pose}(scale: amount rotation: 3°)
            60%: ${Pose}(scale: amount rotation: -3°)
            70%: ${Pose}(scale: amount rotation: 3°)
            80%: ${Pose}(scale: amount rotation: -3°)
            90%: ${Pose}(scale: amount rotation: 3°)
            100%: ${Pose}(scale: 1 rotation: 0°)
        }`,
    ),
    animation(
        'wiggle',
        angle('5°'),
        `{
            0%: ${Pose}(offset: ${Place}(x: 0m) rotation: 0°)
            15%: ${Pose}(offset: ${Place}(x: -.25m) rotation: -1 × angle)
            30%: ${Pose}(offset: ${Place}(x: .2m) rotation: angle)
            45%: ${Pose}(offset: ${Place}(x: -.15m) rotation: -1 × angle)
            60%: ${Pose}(offset: ${Place}(x: .1m) rotation: angle)
            75%: ${Pose}(offset: ${Place}(x: -.05m) rotation: -1 × angle)
            100%: ${Pose}(offset: ${Place}(x: 0m) rotation: 0°)
        }`,
    ),
    animation(
        'flash',
        [],
        `{
            0%: ${Pose}(opacity: 100%)
            25%: ${Pose}(opacity: 0%)
            50%: ${Pose}(opacity: 100%)
            75%: ${Pose}(opacity: 0%)
            100%: ${Pose}(opacity: 100%)
        }`,
    ),
    animation(
        'swing',
        angle('15°'),
        // Each arc is smaller than the last, so the swing settles instead of repeating.
        `{
            0%: ${Pose}(rotation: 0°)
            20%: ${Pose}(rotation: angle)
            40%: ${Pose}(rotation: -0.7 × angle)
            60%: ${Pose}(rotation: 0.5 × angle)
            80%: ${Pose}(rotation: -0.3 × angle)
            100%: ${Pose}(rotation: 0°)
        }`,
    ),
    animation(
        'blink',
        [],
        // Paired keyframes hold each state, so the change reads as a cut rather than a fade.
        `{
            0%: ${Pose}(opacity: 100%)
            49%: ${Pose}(opacity: 100%)
            50%: ${Pose}(opacity: 0%)
            99%: ${Pose}(opacity: 0%)
            100%: ${Pose}(opacity: 100%)
        }`,
    ),
    animation(
        'nod',
        distance('0.3m'),
        `{
            0%: ${Pose}(offset: ${Place}(y: 0m))
            20%: ${Pose}(offset: ${Place}(y: -1 × distance))
            40%: ${Pose}(offset: ${Place}(y: 0m))
            60%: ${Pose}(offset: ${Place}(y: -1 × distance))
            80%: ${Pose}(offset: ${Place}(y: 0m))
            100%: ${Pose}(offset: ${Place}(y: 0m))
        }`,
    ),
    animation(
        'dim',
        amount('30%', '%'),
        `{
            0%: ${Pose}(opacity: 100%)
            50%: ${Pose}(opacity: amount)
            100%: ${Pose}(opacity: 100%)
        }`,
    ),

    // --- Entrances ---
    animation(
        'zoomin',
        [],
        `{
            0%: ${Pose}(scale: 0)
            100%: ${Pose}(scale: 1)
        }`,
    ),
    animation(
        'fadeinup',
        distance('1m'),
        `{
            0%: ${Pose}(opacity: 0% offset: ${Place}(y: -1 × distance))
            100%: ${Pose}(opacity: 100% offset: ${Place}(y: 0m))
        }`,
    ),
    animation(
        'fadeindown',
        distance('1m'),
        `{
            0%: ${Pose}(opacity: 0% offset: ${Place}(y: distance))
            100%: ${Pose}(opacity: 100% offset: ${Place}(y: 0m))
        }`,
    ),
    animation(
        'fadeinleft',
        distance('1m'),
        `{
            0%: ${Pose}(opacity: 0% offset: ${Place}(x: -1 × distance))
            100%: ${Pose}(opacity: 100% offset: ${Place}(x: 0m))
        }`,
    ),
    animation(
        'fadeinright',
        distance('1m'),
        `{
            0%: ${Pose}(opacity: 0% offset: ${Place}(x: distance))
            100%: ${Pose}(opacity: 100% offset: ${Place}(x: 0m))
        }`,
    ),
    animation(
        'rotatein',
        angle('360°'),
        `{
            0%: ${Pose}(rotation: angle opacity: 0%)
            100%: ${Pose}(rotation: 0° opacity: 100%)
        }`,
    ),
    animation(
        'slidein',
        [{ bind: (a) => a.from, type: Place, value: `${Place}(x: -3m y: 0m)` }],
        `{
            0%: ${Pose}(offset: from)
            100%: ${Pose}(offset: ${Place}(x: 0m y: 0m))
        }`,
    ),

    // --- Exits ---
    animation(
        'zoomout',
        [],
        `{
            0%: ${Pose}(scale: 1)
            100%: ${Pose}(scale: 0)
        }`,
    ),
    animation(
        'fadeoutup',
        distance('1m'),
        `{
            0%: ${Pose}(opacity: 100% offset: ${Place}(y: 0m))
            100%: ${Pose}(opacity: 0% offset: ${Place}(y: distance))
        }`,
    ),
    animation(
        'fadeoutdown',
        distance('1m'),
        `{
            0%: ${Pose}(opacity: 100% offset: ${Place}(y: 0m))
            100%: ${Pose}(opacity: 0% offset: ${Place}(y: -1 × distance))
        }`,
    ),
    animation(
        'fadeoutleft',
        distance('1m'),
        `{
            0%: ${Pose}(opacity: 100% offset: ${Place}(x: 0m))
            100%: ${Pose}(opacity: 0% offset: ${Place}(x: -1 × distance))
        }`,
    ),
    animation(
        'fadeoutright',
        distance('1m'),
        `{
            0%: ${Pose}(opacity: 100% offset: ${Place}(x: 0m))
            100%: ${Pose}(opacity: 0% offset: ${Place}(x: distance))
        }`,
    ),
    animation(
        'rotateout',
        angle('360°'),
        `{
            0%: ${Pose}(rotation: 0° opacity: 100%)
            100%: ${Pose}(rotation: angle opacity: 0%)
        }`,
    ),
    animation(
        'slideout',
        [{ bind: (a) => a.to, type: Place, value: `${Place}(x: 3m y: 0m)` }],
        `{
            0%: ${Pose}(offset: ${Place}(x: 0m y: 0m))
            100%: ${Pose}(offset: to)
        }`,
    ),

    // --- Ambient ---
    animation(
        'float',
        distance('0.3m'),
        `{
            0%: ${Pose}(offset: ${Place}(y: 0m))
            50%: ${Pose}(offset: ${Place}(y: distance))
            100%: ${Pose}(offset: ${Place}(y: 0m))
        }`,
    ),
    animation(
        'drift',
        distance('0.3m'),
        `{
            0%: ${Pose}(offset: ${Place}(x: 0m))
            50%: ${Pose}(offset: ${Place}(x: distance))
            100%: ${Pose}(offset: ${Place}(x: 0m))
        }`,
    ),
    animation(
        'orbit',
        [{ bind: (a) => a.radius, type: '#m', value: '1m' }],
        // Eight points around a circle; 0.707 is cos(45°), the diagonals.
        `{
            0%: ${Pose}(offset: ${Place}(x: radius y: 0m))
            12.5%: ${Pose}(offset: ${Place}(x: 0.707 × radius y: 0.707 × radius))
            25%: ${Pose}(offset: ${Place}(x: 0m y: radius))
            37.5%: ${Pose}(offset: ${Place}(x: -0.707 × radius y: 0.707 × radius))
            50%: ${Pose}(offset: ${Place}(x: -1 × radius y: 0m))
            62.5%: ${Pose}(offset: ${Place}(x: -0.707 × radius y: -0.707 × radius))
            75%: ${Pose}(offset: ${Place}(x: 0m y: -1 × radius))
            87.5%: ${Pose}(offset: ${Place}(x: 0.707 × radius y: -0.707 × radius))
            100%: ${Pose}(offset: ${Place}(x: radius y: 0m))
        }`,
    ),

    // --- Color ---
    animation(
        'rainbow',
        [],
        `{
            0%: ${Pose}(color: ${Color}(80% 99 0°))
            25%: ${Pose}(color: ${Color}(80% 99 90°))
            50%: ${Pose}(color: ${Color}(80% 99 180°))
            75%: ${Pose}(color: ${Color}(80% 99 270°))
            100%: ${Pose}(color: ${Color}(80% 99 360°))
        }`,
    ),
    animation(
        'glow',
        [{ bind: (a) => a.color, type: Color, value: `${Color}.orange` }],
        `{
            0%: ${Pose}(color: color.darker(20%))
            50%: ${Pose}(color: color.lighter(20%))
            100%: ${Pose}(color: color.darker(20%))
        }`,
    ),
];
