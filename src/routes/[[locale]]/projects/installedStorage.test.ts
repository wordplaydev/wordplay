import { expect, test } from 'vitest';
import shouldExplainInstalledStorage from './installedStorage';

/** The one state the notice is for: installed, signed out, nothing to show. */
const Explaining = {
    standalone: true,
    signedIn: false,
    hydrated: true,
    projectCount: 0,
};

test('explains when installed and signed out with nothing to show', () => {
    expect(shouldExplainInstalledStorage(Explaining)).toBe(true);
});

test.each([
    [
        'in a browser tab, where storage is not partitioned',
        { standalone: false },
    ],
    [
        'signed in, since the cloud copy is in both containers',
        { signedIn: true },
    ],
    ['before hydration, when the count is not yet known', { hydrated: false }],
    ['once there are projects to show', { projectCount: 1 }],
])('stays quiet %s', (_, override) => {
    expect(shouldExplainInstalledStorage({ ...Explaining, ...override })).toBe(
        false,
    );
});
