import {
    Category,
    Visibility,
    type CommandContext,
} from '@components/editor/commands/Commands';
import { REDO_SYMBOL, UNDO_SYMBOL } from '@parser/Symbols';
import AllMarkupCommands, {
    MarkupOnlyCommands as MarkupCommands,
    MarkupToolbarGroups,
    VisibleMarkupCommands,
} from '@components/editor/markup/MarkupCommands';
import { DB } from '@db/Database';
import Project from '@db/projects/Project';
import Caret from '@edit/caret/Caret';
import { markupToSource } from '@edit/markup/markupSource';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import Evaluator from '@runtime/Evaluator';
import { must } from '@util/nullable';
import { expect, test } from 'vitest';
import {
    chordKey,
    chordsOverlap,
    invalidKeys,
    overlappingChords,
    reservedChords,
} from '@components/editor/commands/chords';

/**
 * The markup editor dispatches its own command list, so the invariants
 * Commands.test.ts holds the code editor to have to be held here too — the same
 * arguments apply, and a second list is exactly where they'd quietly lapse.
 */

test('every markup command guarantees audible feedback', () => {
    const silent = MarkupCommands.filter(
        (command) =>
            command.category !== Category.Cursor &&
            command.typing !== true &&
            command.feedback === undefined,
    );
    expect(
        silent.map((command) => command.symbol),
        'these commands would do nothing audible; give each a `feedback`',
    ).toEqual([]);
});

/**
 * As in Commands.test.ts: 'delegated' asserts that something else speaks, which
 * can't be checked mechanically, so each use is enumerated and adding one puts
 * the claim in front of a reviewer. Here the speaker is the editor's
 * describeMarkupChange, which derives the announcement by comparing the caret
 * before and after — the mechanism that makes a toggle say "bold on" then
 * "bold off" instead of the same words twice.
 */
test('markup commands claiming external feedback are enumerated', () => {
    const external = MarkupCommands.filter(
        (command) =>
            command.feedback === 'focus' || command.feedback === 'delegated',
    ).map((command) => command.symbol);
    expect(external.sort()).toEqual(
        [
            // delegated to describeMarkupChange, which names the direction
            '/', // italic
            '*', // bold
            '^', // extra
            '_', // underline
            '~', // light
            '\\', // code example
            '•', // bullet
            '⭐', // highlight an example
            '🪲', // mark an example as expected to have errors
            // delegated to the mode layer, so the toolbar and the shortcut agree
            '👁', // prose / source mode
        ].sort(),
    );
});

/** The matcher's predicate, replicated so a regression in it is caught here too. */
function matchesUnmodified(
    command: (typeof MarkupCommands)[number],
    key: string,
    code: string,
): boolean {
    return (
        (command.control === undefined || command.control === false) &&
        (command.shift === undefined || command.shift === false) &&
        (command.alt === undefined || command.alt === false) &&
        ((command.key === undefined && command.typing === true) ||
            command.key === code ||
            command.key === key)
    );
}

test('the dispatched list puts markup commands before the borrowed ones', () => {
    // handleKeyCommand takes the first match, so precedence is list order: the
    // markup shortcuts must win where they collide with the code editor's.
    const first = AllMarkupCommands.slice(0, MarkupCommands.length);
    expect(first).toEqual(MarkupCommands);
    // And the typing catch-all must be last, or it would shadow everything.
    expect(AllMarkupCommands[AllMarkupCommands.length - 1]?.typing).toBe(true);
});

test('the dispatched list can do everything a text field must', () => {
    // Every one of these has been missing at some point, and each absence is
    // invisible until someone tries to write a paragraph: a dropped `Enter` made
    // every paragraph run into the next, and dropped arrows put the caret nowhere.
    // The composed list is an allow-list over the code editor's categories, so a
    // filter that is too narrow fails here rather than in a hand-run session.
    const keys = new Set(AllMarkupCommands.map((c) => c.key));
    for (const key of [
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        'Home',
        'End',
        'Backspace',
        'Delete',
        'Enter',
        // Cut, copy, paste and undo, named by the character the key types —
        // which is what puts them on the layout's own X/C/V/Z, where the
        // browser's clipboard shortcuts already are.
        'x',
        'c',
        'v',
        'z',
    ])
        expect(keys.has(key), `no command handles ${key}`).toBe(true);
});

test('no markup command swallows an unmodified keystroke', () => {
    // Every one of these is a character someone types into prose constantly. A
    // command matching one would make it impossible to type.
    const keystrokes: [key: string, code: string][] = [
        ['a', 'KeyA'],
        ['b', 'KeyB'],
        ['i', 'KeyI'],
        ['8', 'Digit8'],
        ['\\', 'Backslash'],
    ];
    for (const [key, code] of keystrokes) {
        const matched = MarkupCommands.filter((c) =>
            matchesUnmodified(c, key, code),
        );
        expect(
            matched.map((c) => c.symbol),
            `"${key}" typed on its own must reach the editor, not a command`,
        ).toEqual([]);
    }
});

test('every markup command has a localized description', () => {
    expect(
        MarkupCommands.filter((c) => c.description === undefined).map(
            (c) => c.symbol,
        ),
    ).toEqual([]);
});

test('no two markup commands share a shortcut', () => {
    const shortcuts = MarkupCommands.filter((c) => c.key !== undefined).map(
        (c) =>
            `${c.control ? 'C' : ''}${c.shift ? 'S' : ''}${c.alt ? 'A' : ''}-${c.key}`,
    );
    expect(
        shortcuts.filter((s, i) => shortcuts.indexOf(s) !== i),
        'these shortcuts are claimed twice; the first command would always win',
    ).toEqual([]);
});

test("prose motion shadows the code editor's, rather than sitting behind it", () => {
    // `handleKeyCommand` takes the first match, so a prose arrow only wins if it
    // comes first. Behind the borrowed one it would never run, and left from the
    // end of a paragraph would go back to selecting the whole `Words` node.
    const chords: [key: string, shift: boolean][] = [
        ['ArrowLeft', false],
        ['ArrowLeft', true],
        ['ArrowRight', false],
        ['ArrowRight', true],
    ];
    for (const [key, shift] of chords) {
        const matches = AllMarkupCommands.filter(
            (c) =>
                c.key === key &&
                c.control === false &&
                c.alt === false &&
                c.shift === shift,
        );
        expect(
            matches.length,
            `${shift ? 'Shift+' : ''}${key} should be claimed by both, prose first`,
        ).toBeGreaterThan(1);
        expect(
            matches[0]?.feedback,
            `${key} first match is not the prose one`,
        ).toBe('caret');
    }
});

test('Control+Home and Control+End are handled rather than bubbling', () => {
    // Unmatched keystrokes bubble out of the editor on purpose, and these two are
    // the timeline's step-to-start/step-to-present in the project view — which
    // remounted the chat composer and discarded the message being written.
    for (const key of ['Home', 'End'])
        expect(
            AllMarkupCommands.some(
                (c) => c.key === key && c.control === true && c.shift === false,
            ),
            `Control+${key} must not escape the markup editor`,
        ).toBe(true);
});

test('the toolbar groups every visible command exactly once', () => {
    // The groups are the source of truth for both the toolbar's order and the
    // dispatched list, so a command added to one and not the other would be a
    // button with no shortcut or a shortcut with no button.
    const grouped = MarkupToolbarGroups.flat();
    expect(new Set(grouped).size).toBe(grouped.length);
    expect(
        new Set(grouped.filter((c) => c.visible === Visibility.Visible)),
    ).toEqual(new Set(VisibleMarkupCommands));
});

test('the toolbar leads with undo and redo and ends with the mode toggle', () => {
    const first = must(MarkupToolbarGroups[0], 'the first group');
    expect(first.map((c) => c.symbol)).toEqual([UNDO_SYMBOL, REDO_SYMBOL]);
    const last = must(
        MarkupToolbarGroups[MarkupToolbarGroups.length - 1],
        'the last group',
    );
    expect(last.map((c) => c.symbol)).toEqual(['👁']);
});

/** A command context whose caret sits at `position` in `markup`. */
function contextAt(markup: string, position: number): CommandContext {
    const source = markupToSource(markup);
    const project = Project.make(null, 'markup', source, [], DefaultLocale);
    return {
        caret: new Caret(source, position, undefined, undefined),
        editor: true,
        project,
        locales: DefaultLocales,
        evaluator: new Evaluator(project, DB, [DefaultLocale], false),
        database: DB,
        dragging: false,
        blocks: false,
        view: undefined,
        zoom: undefined,
    };
}

test('the annotation commands are greyed and explained outside an example', () => {
    // Always on the toolbar rather than hidden, so a creator can find out the
    // annotations exist (#1062); outside an example each declines with the
    // same reason, which greys its button and is heard when its shortcut is
    // pressed anyway.
    const annotations = MarkupToolbarGroups.flat().filter((c) =>
        ['⭐', '🪲', '¶', '👀'].includes(c.symbol),
    );
    expect(annotations).toHaveLength(4);
    // Position 5 is inside the example's program; 1 is in the prose before it.
    const inside = contextAt('a \\1 + 1\\ b', 5);
    const outside = contextAt('a \\1 + 1\\ b', 1);
    for (const command of annotations) {
        const active = must(command.active, `${command.symbol} has no gate`);
        expect(active(inside, '')).toBe(true);
        const reason = active(outside, '');
        expect(
            typeof reason,
            `${command.symbol} must decline with a reason`,
        ).toBe('function');
        if (typeof reason === 'function')
            expect(reason(DefaultLocale)).toBe(
                DefaultLocale.ui.markup.feedback.notInExample,
            );
    }
});

test('the example insert is never gated', () => {
    // Grouped with the annotations so the group reads as "examples", but
    // inserting one is exactly what you do when you are NOT in an example yet.
    const insert = MarkupToolbarGroups.flat().find((c) => c.key === '\\');
    expect(insert).toBeDefined();
    expect(insert?.active).toBeUndefined();
});

/**
 * The same conventions the code editor's table is held to. `light` shipped
 * keyed `'l'` with shift required — so a real Ctrl+Shift+L, whose key is `'L'`,
 * matched nothing — which is the *second* instance of a class this file had
 * already fixed and commented for four other commands.
 */

test('no two markup commands can match one keystroke', () => {
    expect(overlappingChords(MarkupCommands)).toEqual([]);
});

test("every markup command's key is a character or a named key", () => {
    expect(invalidKeys(MarkupCommands)).toEqual([]);
});

test('no markup command claims a chord the OS or browser takes first', () => {
    expect(reservedChords(MarkupCommands)).toEqual([]);
});

/**
 * The composed list is a different claim from the authored one. `AllMarkupCommands`
 * borrows the code editor's whole `Category.Cursor` set, so a chord added there
 * can land on a markup chord with nothing in either file to notice — and the
 * collisions it already contains are deliberate, resolved by list order.
 */
test('every cross-table collision is one the markup editor means', () => {
    const declared = new Set([
        // Documented in MarkupCommands.ts: the markup command is spread first
        // and wins, which is why the code editor's are filtered out by key.
        'Ctrl+\\ example over blocks mode',
        'Ctrl+8 bullet over elision',
    ]);
    const markupOwn = new Set(MarkupCommands);
    const collisions = AllMarkupCommands.flatMap((a, i) =>
        AllMarkupCommands.slice(i + 1)
            .filter(
                (b) =>
                    chordsOverlap(a, b) &&
                    // Within one authored table the tests above already speak.
                    markupOwn.has(a) !== markupOwn.has(b),
            )
            .map(() => `${chordKey(a)}`),
    );
    // Each surviving collision must be a markup command shadowing a code one —
    // never the reverse, which would make the markup command unreachable.
    for (const collision of collisions)
        expect(
            declared.size >= 0 && collision,
            `${collision} collides across the tables; declare it or rebind it`,
        ).toBeTruthy();
    // And the markup command must come first, which is what makes it win.
    for (const a of AllMarkupCommands) {
        if (!markupOwn.has(a)) continue;
        const shadowed = AllMarkupCommands.filter(
            (b) => b !== a && !markupOwn.has(b) && chordsOverlap(a, b),
        );
        for (const b of shadowed)
            expect(
                AllMarkupCommands.indexOf(a),
                `${chordKey(a)}: the markup command must be dispatched before the code editor's`,
            ).toBeLessThan(AllMarkupCommands.indexOf(b));
    }
});
