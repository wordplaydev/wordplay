import Watchers from '@db/Watchers';
import { expect, test } from 'vitest';

/** A `start` that records how often it ran and how often its stop was called. */
function counter() {
    const state = { started: 0, stopped: 0 };
    const start = () => {
        state.started++;
        return () => {
            state.stopped++;
        };
    };
    return { state, start };
}

test('several holders of one key share a single subscription', () => {
    const watchers = new Watchers();
    const { state, start } = counter();

    const first = watchers.watch('a', start);
    const second = watchers.watch('a', start);
    const third = watchers.watch('a', start);
    expect(state.started).toBe(1);

    first();
    second();
    expect(state.stopped).toBe(0);
    expect(watchers.has('a')).toBe(true);

    third();
    expect(state.stopped).toBe(1);
    expect(watchers.has('a')).toBe(false);
});

test('a release is idempotent', () => {
    const watchers = new Watchers();
    const { state, start } = counter();

    const first = watchers.watch('a', start);
    const second = watchers.watch('a', start);

    // A teardown that ran twice must not drop the count below what `second`
    // still holds.
    first();
    first();
    expect(state.stopped).toBe(0);
    expect(watchers.has('a')).toBe(true);

    second();
    expect(state.stopped).toBe(1);
});

test('keys are independent', () => {
    const watchers = new Watchers();
    const a = counter();
    const b = counter();

    const releaseA = watchers.watch('a', a.start);
    watchers.watch('b', b.start);

    releaseA();
    expect(a.state.stopped).toBe(1);
    expect(b.state.stopped).toBe(0);
    expect(watchers.keys()).toEqual(['b']);
});

test('restart re-runs start without disturbing who holds the key', () => {
    const watchers = new Watchers();
    const { state, start } = counter();

    const first = watchers.watch('a', start);
    watchers.watch('a', start);

    watchers.restart('a');
    expect(state.stopped).toBe(1);
    expect(state.started).toBe(2);
    expect(watchers.has('a')).toBe(true);

    // Still two holders, so one release keeps it alive.
    first();
    expect(state.stopped).toBe(1);
});

test('restart with no key restarts everything watched', () => {
    const watchers = new Watchers();
    const a = counter();
    const b = counter();

    watchers.watch('a', a.start);
    watchers.watch('b', b.start);
    watchers.restart();

    expect(a.state.started).toBe(2);
    expect(b.state.started).toBe(2);
});

test('stop ends a key whoever holds it, and a later release is harmless', () => {
    const watchers = new Watchers();
    const { state, start } = counter();

    const release = watchers.watch('a', start);
    watchers.stop('a');
    expect(state.stopped).toBe(1);
    expect(watchers.has('a')).toBe(false);

    release();
    expect(state.stopped).toBe(1);
});

test('stopAll ends every key', () => {
    const watchers = new Watchers();
    const a = counter();
    const b = counter();

    watchers.watch('a', a.start);
    watchers.watch('b', b.start);
    watchers.stopAll();

    expect(a.state.stopped).toBe(1);
    expect(b.state.stopped).toBe(1);
    expect(watchers.keys()).toEqual([]);
});
