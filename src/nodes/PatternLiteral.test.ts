import Block from '@nodes/Block';
import PatternClass from '@nodes/PatternClass';
import PatternLiteral from '@nodes/PatternLiteral';
import Source from '@nodes/Source';
import { expect, test } from 'vitest';

/**
 * Parsing/round-trip coverage: every LANGUAGE.md example parses and prints
 * back exactly (the Source preserves the original spacing). Matching behavior
 * is covered by the runtime suites in `@runtime/pattern`.
 */
test.each([
    '\'555-1234\' ≈ ⣿3 # "-" 4 #⣿',
    'post ⌕ ⣿"#" >0 (_ | #)⣿',
    '⣿"#" 6 {# "a"–"f" "A"–"F"}⣿',
    "⣿'\"' body:(≥0 (~'\"')) '\"'⣿",
    '⣿≤1 "-" >0 # ≤1 ("." >0 #)⣿',
    '\'2026-06-15\' ⌕ ⣿⊢ y:(4 #) "-" m:(2 #) "-" d:(2 #) ⊣⣿',
    '⣿w: ▭/en >0 ␣ w⣿',
    '⣿▸(≥0 (~#) #) ▸(≥0 (~{"!" "?" "#"}) {"!" "?" "#"}) 8–64 ◌⣿',
    'text ⌕ ⣿┊/en "cat" ┊/en⣿',
    'post ⌕ ⣿⇕("hello")⣿',
    'text ⌕ ⣿(⊢ | ◂(linebreak)) label:(≥0 (~{":" linebreak})) ":"⣿',
    // Extra atoms.
    '⣿_/greek ◌/Script=Greek …⣿',
    // Full language tags (region + multilingual join), reusing the Language node.
    '⣿▭/en-US⣿',
    '⣿▭/es_en⣿',
    '⣿┊/zh-Hant "x"⣿',
    '⣿⇕/tr("i")⣿',
])('round-trips %s', (code: string) => {
    expect(new Source('test', code).code.toString()).toBe(code);
});

test('parses a character-class sequence', () => {
    const block = new Source('test', '⣿◌ _ # ␣⣿').expression
        .expression as Block;
    const lit = block.statements[0] as PatternLiteral;
    expect(lit).toBeInstanceOf(PatternLiteral);
    expect(lit.body?.items).toHaveLength(4);
    expect(lit.body?.items.every((i) => i instanceof PatternClass)).toBe(true);
});

test('an unclosed pattern leaves close undefined (conflict)', () => {
    const block = new Source('test', '⣿◌').expression.expression as Block;
    const lit = block.statements[0] as PatternLiteral;
    expect(lit).toBeInstanceOf(PatternLiteral);
    expect(lit.close).toBeUndefined();
});
