import { Category, Visibility } from '@components/editor/commands/Commands';
import { REDO_SYMBOL, UNDO_SYMBOL } from '@parser/Symbols';
import AllMarkupCommands, {
    ExampleOnlyCommands,
    MarkupOnlyCommands as MarkupCommands,
    MarkupToolbarGroups,
    VisibleMarkupCommands,
} from '@components/editor/markup/MarkupCommands';
import { expect, test } from 'vitest';

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
    expect(AllMarkupCommands[AllMarkupCommands.length - 1].typing).toBe(true);
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
        'KeyX',
        'KeyC',
        'KeyV',
        'KeyZ',
    ])
        expect(keys.has(key), `no command handles ${key}`).toBe(true);
});

test('no markup command swallows an unmodified keystroke', () => {
    // Every one of these is a character someone types into prose constantly. A
    // command matching one would make it impossible to type.
    for (const [key, code] of [
        ['a', 'KeyA'],
        ['b', 'KeyB'],
        ['i', 'KeyI'],
        ['8', 'Digit8'],
        ['\\', 'Backslash'],
    ]) {
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
    for (const [key, shift] of [
        ['ArrowLeft', false],
        ['ArrowLeft', true],
        ['ArrowRight', false],
        ['ArrowRight', true],
    ] as [string, boolean][]) {
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
    const first = MarkupToolbarGroups[0].map((c) => c.symbol);
    expect(first).toEqual([UNDO_SYMBOL, REDO_SYMBOL]);
    const last = MarkupToolbarGroups[MarkupToolbarGroups.length - 1];
    expect(last.map((c) => c.symbol)).toEqual(['👁']);
});

test('the commands the toolbar hides outside an example are enumerated', () => {
    // Enumerated rather than derived, like the 'delegated' feedback list above:
    // hiding a button is a judgement about what a command means, so adding one
    // here should put that judgement in front of a reviewer.
    expect(ExampleOnlyCommands.map((c) => c.symbol).sort()).toEqual(
        [
            '⭐', // highlight an example
            '🪲', // mark an example as expected to have errors
            '¶', // explain an expression inside an example
            '👀', // draw attention to a line of an example
        ].sort(),
    );
    for (const command of ExampleOnlyCommands) {
        // In a group, or hiding it would remove nothing from the toolbar.
        expect(MarkupToolbarGroups.flat()).toContain(command);
        // And still `active`-gated, so the SHORTCUT is consumed and explained
        // outside an example rather than silently doing nothing.
        expect(
            command.active,
            `${command.symbol} must stay active-gated`,
        ).toBeDefined();
    }
});

test('the example insert stays visible when its annotations hide', () => {
    // It is grouped with them so the group reads as "examples", but inserting one
    // is exactly what you do when you are NOT in an example yet.
    const group = MarkupToolbarGroups.find((g) =>
        g.some((c) => ExampleOnlyCommands.includes(c)),
    );
    expect(group).toBeDefined();
    const insert = group?.find((c) => !ExampleOnlyCommands.includes(c));
    expect(insert?.key).toBe('\\');
});
