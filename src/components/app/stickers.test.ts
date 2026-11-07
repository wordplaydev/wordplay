import { expect, test } from 'vitest';
import { StickerSide } from '../../../scripts/logo/manifest';
import { stickerSVG } from '../../../scripts/logo/stickers';

/**
 * The printed sticker is uploaded to a print shop that has none of our
 * fonts, so every glyph must arrive as an outline.
 */
test('the sticker has no text left to shape', () => {
    expect(stickerSVG()).not.toContain('<text');
});

test('the sticker is square', () => {
    expect(stickerSVG()).toContain(
        `viewBox="0 0 ${StickerSide} ${StickerSide}"`,
    );
});
