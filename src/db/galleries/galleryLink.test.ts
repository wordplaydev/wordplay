import { expect, test } from 'vitest';
import Gallery from './Gallery';

/** A gallery with just enough to have a link. */
function gallery(opts: { path?: string | null; public?: boolean } = {}) {
    return Gallery.make(
        'e0b1c2d3-4f89-11d3-9a0c-0305e82c3301',
        { 'en-US': 'Ms Kim' },
        { 'en-US': '' },
        ['curator'],
        [],
        opts,
    );
}

test('a gallery with no vanity path links by id', () => {
    expect(gallery({ public: true }).getLink()).toBe(
        '/gallery/e0b1c2d3-4f89-11d3-9a0c-0305e82c3301',
    );
});

test('a public gallery with a vanity path links by path', () => {
    expect(gallery({ path: 'kim-p4', public: true }).getLink()).toBe(
        '/gallery/kim-p4',
    );
});

test('a private gallery links by id even when it holds a path', () => {
    // The path stays reserved — nobody else may claim it — but it does not
    // resolve while the gallery is private, so linking by it would hand out a
    // URL that 404s. The id still works for the curators who can see it.
    expect(gallery({ path: 'kim-p4', public: false }).getLink()).toBe(
        '/gallery/e0b1c2d3-4f89-11d3-9a0c-0305e82c3301',
    );
});

test('a path outside ASCII is percent-encoded', () => {
    // getLink did not encode before vanity paths, which was safe only because
    // an id is always a UUID.
    expect(gallery({ path: '日本語-ゲーム', public: true }).getLink()).toBe(
        '/gallery/' + encodeURIComponent('日本語-ゲーム'),
    );
});

test('the link is gated on public, not on approval', () => {
    // A gallery that is public but still waiting for a moderator resolves by
    // path — the read rule asks only about `public`. Gating on approval would
    // hand it a link that 404s while it waits.
    expect(
        gallery({
            path: 'kim-p4',
            public: true,
        })
            .withPath('kim-p4')
            .getLink(),
    ).toBe('/gallery/kim-p4');
});
