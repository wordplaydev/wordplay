import { expect, test } from 'vitest';
import evaluateCode from '@runtime/evaluate';

// `⬚` (This) refers to an implicit value supplied by the nearest enclosing
// structure, conversion, reaction, or translate. These exercise each context.
test.each([
    // Conversion: ⬚ is the (unit-stripped) value being converted.
    ['→ #kitty #cat ⬚ ÷ 2\n6kitty→#cat', '3'],
    // Reaction: ⬚ is the most recent value.
    ['1 … ∆ Time(100ms) … ⬚ + 1', '1'],
    // Translate: ⬚ is the current item.
    ['[1 2 3] ↦ ⬚ + 1', '[2 3 4]'],
    // Structure method: ⬚ is the instance it was called on, reachable with ⬚.prop.
    ['•Card(rank•#) (\n\tƒ beats(other•Card) ⬚.rank > other.rank\n)\n\nCard(10).beats(Card(7))', '⊤'],
    // Structure method returning the instance's own property via ⬚.
    ['•Card(rank•#) (\n\tƒ r() ⬚.rank\n)\n\nCard(10).r()', '10'],
    // A method closing over a construction-time local still resolves it.
    ['•C() (\n\tsecret: 42\n\tƒ get() secret\n)\n\nC().get()', '42'],
])('Expect %s to be %s', (code, value) => {
    expect(evaluateCode(code)?.toString()).toBe(value);
});
