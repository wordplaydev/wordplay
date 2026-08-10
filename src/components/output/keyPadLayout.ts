/**
 * Arranging a project's keys into something that reads like the keyboard it
 * replaces: arrows in the cluster hands already know, a pair of opposed keys
 * at opposite edges, letters in their keyboard order, and the space bar wide
 * and last. A pure function so the arrangement can be tested without a stage.
 */

export type KeyPadSlot = {
    /** The canonical key to send. */
    key: string;
    /** Whether the button should stretch, as the space bar does. */
    wide: boolean;
};

export type KeyPadSection =
    /**
     * The arrow cluster — up centered over left, down, right — with every
     * other key alongside it rather than stacked beneath. The cluster is two
     * rows tall on its own, and a pad any taller than that starts covering
     * the stage it's meant to let you play.
     */
    | {
          kind: 'arrows';
          up: boolean;
          down: boolean;
          left: boolean;
          right: boolean;
          beside: KeyPadSlot[];
      }
    /** Two keys pushed to opposite edges, with anything else between them. */
    | { kind: 'spread'; left: KeyPadSlot; right: KeyPadSlot; middle: KeyPadSlot[] }
    /** A centered row. */
    | { kind: 'row'; keys: KeyPadSlot[] };

const Space = ' ';
const Arrows = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

/** Keyboard order, so a row of letters sits in the order fingers expect
 * rather than alphabetically. */
const KeyboardOrder = '1234567890qwertyuiopasdfghjklzxcvbnm';

/** Beyond this a row is hard to hit accurately, so it wraps. */
const MaxRowLength = 8;

function slot(key: string, wide = false): KeyPadSlot {
    return { key, wide };
}

/** A single character a creator could type, as opposed to a named key. */
function isCharacter(key: string): boolean {
    return key !== Space && Array.from(key).length === 1;
}

function byKeyboardOrder(a: string, b: string): number {
    const first = KeyboardOrder.indexOf(a.toLowerCase());
    const second = KeyboardOrder.indexOf(b.toLowerCase());
    if (first === -1 && second === -1) return a.localeCompare(b);
    // Anything off the keyboard map sorts after everything on it.
    if (first === -1) return 1;
    if (second === -1) return -1;
    return first - second;
}

function rows(keys: string[]): KeyPadSection[] {
    const sections: KeyPadSection[] = [];
    for (let index = 0; index < keys.length; index += MaxRowLength)
        sections.push({
            kind: 'row',
            keys: keys.slice(index, index + MaxRowLength).map((k) => slot(k)),
        });
    return sections;
}

/** Arrange keys into sections, ordered top to bottom. */
export default function layoutKeyPad(
    keys: ReadonlySet<string>,
): KeyPadSection[] {
    const present = new Set(keys);
    const arrows = Arrows.filter((arrow) => present.has(arrow));
    const hasSpace = present.has(Space);
    const rest = Array.from(present).filter(
        (key) => key !== Space && !Arrows.includes(key),
    );
    const characters = rest.filter(isCharacter).sort(byKeyboardOrder);
    const named = rest.filter((key) => !isCharacter(key)).sort();

    const sections: KeyPadSection[] = [];
    const vertical = present.has('ArrowUp') || present.has('ArrowDown');

    // Exactly left and right, with nothing to steer vertically, is a project
    // played with two thumbs — so put them where two thumbs already are.
    if (arrows.length === 2 && !vertical) {
        const middle = [
            ...named.map((key) => slot(key)),
            ...characters.map((key) => slot(key)),
            ...(hasSpace ? [slot(Space, true)] : []),
        ];
        return [
            {
                kind: 'spread',
                left: slot('ArrowLeft'),
                right: slot('ArrowRight'),
                middle,
            },
        ];
    }

    if (arrows.length > 0) {
        // Everything else tiles beside the cluster, so the pad stays two rows
        // tall however many keys a project uses. Nothing is wide here —
        // width is what the cluster leaves over.
        const beside = [
            ...named.map((key) => slot(key)),
            ...characters.map((key) => slot(key)),
            ...(hasSpace ? [slot(Space)] : []),
        ];
        return [
            {
                kind: 'arrows',
                up: present.has('ArrowUp'),
                down: present.has('ArrowDown'),
                left: present.has('ArrowLeft'),
                right: present.has('ArrowRight'),
                beside,
            },
        ];
    }

    if (named.length > 0) sections.push(...rows(named));
    if (characters.length > 0) sections.push(...rows(characters));
    // The space bar is last and wide, as it is on a keyboard.
    if (hasSpace) sections.push({ kind: 'row', keys: [slot(Space, true)] });

    return sections;
}
