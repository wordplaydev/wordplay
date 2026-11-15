import { afterEach, expect, test } from 'vitest';
import {
    ConsentState,
    getBrowserFamily,
    watchPermission,
} from '#input/permissions.ts';

test.each([
    [
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
        'chromium',
    ],
    [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0',
        'chromium',
    ],
    [
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15',
        'safari',
    ],
    [
        'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
        'safari',
    ],
    [
        'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0 Mobile/15E148 Safari/604.1',
        'other',
    ],
    [
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:144.0) Gecko/20100101 Firefox/144.0',
        'firefox',
    ],
    ['', 'other'],
])('%s is %s', (agent, family) => {
    expect(getBrowserFamily(agent)).toBe(family);
});

const original = Object.getOwnPropertyDescriptor(navigator, 'permissions');

afterEach(() => {
    if (original) Object.defineProperty(navigator, 'permissions', original);
    else Reflect.deleteProperty(navigator, 'permissions');
});

/** Let the status query answer. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

/** A permission status whose state can be changed, as a site setting would. */
function fakeStatus() {
    const target = new EventTarget();
    let state: PermissionState = 'denied';
    // A getter, since Object.assign would copy the state once.
    const status = Object.defineProperty(target, 'state', {
        get: () => state,
    });
    Object.defineProperty(navigator, 'permissions', {
        configurable: true,
        value: { query: () => Promise.resolve(status) },
    });
    return (next: PermissionState) => {
        state = next;
        target.dispatchEvent(new Event('change'));
    };
}

test('watchPermission reports a site-setting change', async () => {
    const change = fakeStatus();
    const seen: ConsentState[] = [];
    const stop = watchPermission('microphone', (state) => seen.push(state));
    await settle();
    change('granted');
    change('prompt');
    expect(seen).toEqual([ConsentState.Granted, ConsentState.Unknown]);
    stop();
    change('granted');
    expect(seen).toHaveLength(2);
});

test('watchPermission stopped before the query answers never listens', async () => {
    const change = fakeStatus();
    const seen: ConsentState[] = [];
    watchPermission('camera', (state) => seen.push(state))();
    await settle();
    change('granted');
    expect(seen).toEqual([]);
});
