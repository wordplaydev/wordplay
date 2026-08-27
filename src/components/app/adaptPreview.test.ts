import { adaptPreviewColors } from '@components/app/adaptPreview';
import { expect, test } from 'vitest';

const White = 'lch(100% 0 0deg)';
const Black = 'lch(0% 0 0deg)';
const MidGrey = 'lch(60% 0 0deg)';

test('adapts a bright preview for a viewer in dark mode', () => {
    const { background, scheme } = adaptPreviewColors(
        { background: White, foreground: Black },
        true,
    );
    expect(scheme).toBe('dark');
    expect(background).not.toBe(White);
});

test('leaves an already-dark preview alone', () => {
    const colors = adaptPreviewColors(
        { background: Black, foreground: White },
        true,
    );
    expect(colors.background).toBe(Black);
    expect(colors.foreground).toBe(White);
    // Still declares dark, so the tile's own chrome tokens resolve correctly —
    // the latent bug this fixes independently of the setting.
    expect(colors.scheme).toBe('dark');
});

test('leaves a mid-toned preview alone', () => {
    expect(
        adaptPreviewColors({ background: MidGrey, foreground: Black }, true),
    ).toMatchObject({ background: MidGrey, scheme: 'light' });
});

test('leaves everything alone for a viewer who opted out', () => {
    const colors = adaptPreviewColors(
        { background: White, foreground: Black },
        false,
    );
    expect(colors.background).toBe(White);
    expect(colors.foreground).toBe(Black);
    expect(colors.scheme).toBe('light');
});

test('follows the app for a manual preview with no creator colors', () => {
    expect(
        adaptPreviewColors({ background: null, foreground: null }, true),
    ).toMatchObject({ background: null, foreground: null, scheme: null });
    expect(adaptPreviewColors(null, true)).toMatchObject({ scheme: null });
});

test('follows the app when the preview stored an error, not a color', () => {
    expect(
        adaptPreviewColors(
            { background: 'var(--wordplay-error)', foreground: null },
            true,
        ),
    ).toMatchObject({ background: 'var(--wordplay-error)', scheme: null });
});
