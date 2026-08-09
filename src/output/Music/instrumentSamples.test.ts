import { expect, test } from 'vitest';
import samples from '@output/Music/InstrumentSamples';
import { Zones } from '@output/Music/samples.generated';

/** Wait for the loader to say something, or give up. */
function settled(done: () => boolean): Promise<void> {
    return new Promise((resolve, reject) => {
        if (done()) return resolve();
        const timer = setTimeout(() => {
            stop();
            reject(new Error('the loader never settled'));
        }, 5000);
        const stop = samples.observe(() => {
            if (!done()) return;
            clearTimeout(timer);
            stop();
            resolve();
        });
    });
}

test('an instrument that has finished downloading is no longer loading', async () => {
    // Any sampled instrument; the state machine is the same for all of them.
    const instrument = Object.keys(Zones)[0];
    expect(instrument, 'no sampled instruments to test with').toBeDefined();

    const original = globalThis.fetch;
    globalThis.fetch = (async () =>
        new Response(new ArrayBuffer(8), { status: 200 })) as typeof fetch;
    try {
        samples.request(instrument);
        // In flight, which is worth telling a creator about.
        expect(samples.loading()).toContain(instrument);

        await settled(() => !samples.loading().includes(instrument));

        // Downloaded. There is nothing left to wait for on the network, so the
        // stage must not still be saying it is loading — that indicator sat on
        // an open project forever, since decoding waits for an AudioContext
        // and the player only makes one when someone presses play.
        expect(samples.loading()).not.toContain(instrument);
        expect(samples.failedInstruments()).not.toContain(instrument);
        // But it isn't playable yet either: the player still has to wait for
        // the decode that its own context will trigger.
        expect(samples.ready(instrument)).toBe(false);
    } finally {
        globalThis.fetch = original;
    }
});

test('an instrument whose files are all missing falls back to synthesis', async () => {
    const instrument = Object.keys(Zones)[1] ?? Object.keys(Zones)[0];
    const original = globalThis.fetch;
    globalThis.fetch = (async () =>
        new Response(null, { status: 404 })) as typeof fetch;
    try {
        samples.request(instrument);
        await settled(() => samples.failedInstruments().includes(instrument));
        // Ready, in the sense the player needs: stop waiting and synthesize,
        // rather than hold the piece for files that are never coming.
        expect(samples.ready(instrument)).toBe(true);
        expect(samples.loading()).not.toContain(instrument);
    } finally {
        globalThis.fetch = original;
    }
});
