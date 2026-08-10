import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { acquireAudioSource } from './AudioSource';

/**
 * The grace period exists because Android Chrome can show an OS permission
 * dialog on every `getUserMedia`, and evaluator rebuilds release and reacquire
 * the mic within a frame. These tests pin the refcount/grace lifecycle with a
 * structural fake navigator, so a regression back to eager teardown fails.
 */

type FakeTrack = { stop: ReturnType<typeof vi.fn> };

/** Streams handed out by the fake getUserMedia, in order. */
let created: FakeTrack[] = [];
let deny = false;
let getUserMedia: ReturnType<typeof vi.fn>;

/** Matches AudioSource's grace constant; long enough to pass it in tests. */
const PastGrace = 6000;

function settings(mic: string | null) {
    return { Settings: { getMic: () => mic } };
}

/** getUserMedia resolves through microtasks, which fake timers don't drain. */
async function flush() {
    for (let i = 0; i < 5; i++) await Promise.resolve();
}

beforeEach(() => {
    vi.useFakeTimers();
    created = [];
    deny = false;
    getUserMedia = vi.fn(() => {
        if (deny) return Promise.reject(new Error('denied'));
        const track: FakeTrack = { stop: vi.fn() };
        created.push(track);
        return Promise.resolve({ getTracks: () => [track] });
    });
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
    class FakeAudioContext {
        createMediaStreamSource() {
            return { disconnect: vi.fn() };
        }
        close() {
            return Promise.resolve();
        }
    }
    vi.stubGlobal('AudioContext', FakeAudioContext);
});

afterEach(async () => {
    // Retire anything idling in its grace period, so the module-level source
    // map carries no state into the next test.
    await vi.runAllTimersAsync();
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

test('Reacquiring within the grace period reuses the live stream', async () => {
    const first = acquireAudioSource(settings('reuse'));
    await flush();
    first.release();
    vi.advanceTimersByTime(1000);
    const second = acquireAudioSource(settings('reuse'));
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(created[0].stop).not.toHaveBeenCalled();
    second.release();
});

test('An idle source tears down after the grace period', async () => {
    const handle = acquireAudioSource(settings('teardown'));
    await flush();
    handle.release();
    expect(created[0].stop).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(PastGrace);
    expect(created[0].stop).toHaveBeenCalled();
    const again = acquireAudioSource(settings('teardown'));
    expect(getUserMedia).toHaveBeenCalledTimes(2);
    again.release();
});

test('Consumers sharing a device share one acquisition', async () => {
    const first = acquireAudioSource(settings('shared'));
    const second = acquireAudioSource(settings('shared'));
    await flush();
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    first.release();
    // One consumer remains, so no teardown is even scheduled.
    await vi.advanceTimersByTimeAsync(PastGrace);
    expect(created[0].stop).not.toHaveBeenCalled();
    second.release();
});

test('Denial retires immediately so the next acquire asks again', async () => {
    deny = true;
    const onDenied = vi.fn();
    const handle = acquireAudioSource(settings('denied'), onDenied);
    await flush();
    expect(onDenied).toHaveBeenCalled();
    handle.release();
    const again = acquireAudioSource(settings('denied'), onDenied);
    await flush();
    expect(getUserMedia).toHaveBeenCalledTimes(2);
    again.release();
});

test('Switching devices retires the idle old device immediately', async () => {
    const old = acquireAudioSource(settings('old-device'));
    await flush();
    old.release();
    const fresh = acquireAudioSource(settings('new-device'));
    expect(created[0].stop).toHaveBeenCalled();
    await flush();
    expect(getUserMedia).toHaveBeenCalledTimes(2);
    fresh.release();
});
