import { afterEach, expect, test } from 'vitest';
import supportsVibration from './supportsVibration';

// The check reads a global, so each case installs its own and restores after.
// Asserting behavior rather than this environment's answer is the point: JSDOM,
// the tsx runtime the locale tools use, and real browsers all disagree here.
const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

afterEach(() => {
    if (original) Object.defineProperty(globalThis, 'navigator', original);
    else Reflect.deleteProperty(globalThis, 'navigator');
});

function setNavigator(value: unknown) {
    Object.defineProperty(globalThis, 'navigator', {
        value,
        configurable: true,
        writable: true,
    });
}

test('false when there is no navigator at all, as during prerender', () => {
    Reflect.deleteProperty(globalThis, 'navigator');
    expect(supportsVibration()).toBe(false);
});

test('false when navigator exists but does not define vibrate', () => {
    setNavigator({});
    expect(supportsVibration()).toBe(false);
});

test('true when navigator defines vibrate', () => {
    setNavigator({ vibrate: () => true });
    expect(supportsVibration()).toBe(true);
});

test('true even when vibrate is present but not yet callable, since presence is the only signal a page gets', () => {
    setNavigator({ vibrate: undefined });
    expect(supportsVibration()).toBe(true);
});
