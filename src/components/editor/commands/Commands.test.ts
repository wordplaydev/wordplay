import { expect, test } from 'vitest';
import Commands, { Category } from './Commands';
import { THIS_SYMBOL, TRANSLATE_SYMBOL } from '@parser/Symbols';

// The GlyphInserter renders every Category.Insert command, so both new
// language symbols must be present as insert commands to be reachable there.
test.each([
    ['translate', TRANSLATE_SYMBOL],
    ['this', THIS_SYMBOL],
])('GlyphInserter offers the %s symbol', (_name, symbol) => {
    const command = Commands.find(
        (c) => c.category === Category.Insert && c.symbol === symbol,
    );
    expect(command, `expected an Insert command for ${symbol}`).toBeDefined();
});
