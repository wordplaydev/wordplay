import Project from '@db/projects/Project';
import { DB } from '@db/Database';
import Key from '@input/Key/Key';
import DefaultLocale from '@locale/DefaultLocale';
import Source from '@nodes/Source';
import Evaluator, { Mode } from '@runtime/Evaluator';
import { expect, test } from 'vitest';

/**
 * A recorded input is replayed into whatever stream its path resolves to in the
 * revised program, and a `Path` names a node type and an index among siblings —
 * so it cannot tell two `Evaluate`s apart. Typing a new stream above an existing
 * one therefore shifts every later index, and an input recorded for one stream
 * arrives at another.
 *
 * That is not a near miss: every `react` trusts its own raw type, so a `Key`
 * event handed to `Speech` reached `text.normalize()` on an object and threw
 * during evaluator construction — while a `Pointer` event handed to `Placement`
 * would have quietly produced nonsense instead. The stream's kind is recorded
 * with the input and checked before replay.
 */
test('an input is not replayed into a different kind of stream', () => {
    const before = new Source('start', 'Key()');
    const first = new Evaluator(
        Project.make('p', 'p', before, [], DefaultLocale),
        DB,
        [DefaultLocale],
        true,
    );
    first.getInitialValue();
    // getInitialValue pauses, and a paused stream ignores values; play so the
    // input is recorded the way a creator's keypress would be.
    first.setMode(Mode.Play);
    const key = first.getBasisStreamsOfType(Key)[0];
    expect(key).toBeDefined();
    key.react({ key: 'a', down: true });
    expect(first.hasInputHistory()).toBe(true);

    // The creator types a Speech() above the Key(), so the recorded input's
    // path now resolves to the Speech evaluate.
    const after = new Source('start', 'Speech()\nKey()');
    const built: Evaluator[] = [];
    expect(() => {
        const second = new Evaluator(
            Project.make('p', 'p', after, [], DefaultLocale),
            DB,
            [DefaultLocale],
            true,
            first,
        );
        second.getInitialValue();
        built.push(second);
    }).not.toThrow();
    // Nothing was replayed, rather than replayed into the wrong stream.
    expect(built[0]?.hasInputHistory()).toBe(false);
});

test('an input is still replayed into the stream that recorded it', () => {
    const source = new Source('start', 'Key()');
    const project = Project.make('p', 'p', source, [], DefaultLocale);
    const first = new Evaluator(project, DB, [DefaultLocale], true);
    first.getInitialValue();
    first.setMode(Mode.Play);
    first.getBasisStreamsOfType(Key)[0]?.react({ key: 'a', down: true });
    expect(first.hasInputHistory()).toBe(true);

    // The guard must not silence replay itself: an unedited program's input
    // still reaches the same stream in the rebuilt evaluator, which records it
    // in turn.
    const second = new Evaluator(project, DB, [DefaultLocale], true, first);
    second.getInitialValue();
    expect(second.hasInputHistory()).toBe(true);
});
