import { expect, test } from 'vitest';
import type Type from '@nodes/Type';
import TypePlaceholder from '@nodes/TypePlaceholder';
import UnionType from '@nodes/UnionType';
import parseType from '@parser/parseType';
import { toTokens } from '@parser/toTokens';
import { PLACEHOLDER_SYMBOL } from '@parser/Symbols';
import {
    summarizeUnionTypes,
    UNION_ELISION_PREVIEW_COUNT,
    UNION_ELISION_THRESHOLD,
} from './elideNode';

/** Flatten a binary UnionType into its leaf members. */
function members(union: UnionType): number {
    let count = 0;
    const walk = (t: Type) => {
        if (t instanceof UnionType) {
            walk(t.left);
            walk(t.right);
        } else count++;
    };
    walk(union);
    return count;
}

test('leaves an at-threshold union unchanged (by reference)', () => {
    const arms = Array.from(
        { length: UNION_ELISION_THRESHOLD },
        (_, i) => `"${i}"`,
    ).join('|');
    const type = parseType(toTokens(arms));
    expect(summarizeUnionTypes(type)).toBe(type);
});

test('summarizes an over-threshold union to preview arms plus a placeholder', () => {
    const arms = Array.from(
        { length: UNION_ELISION_THRESHOLD + 10 },
        (_, i) => `"${i}"`,
    ).join('|');
    const type = parseType(toTokens(arms));
    expect(type).toBeInstanceOf(UnionType);

    const summary = summarizeUnionTypes(type as UnionType);
    expect(summary).toBeInstanceOf(UnionType);
    // Preview arms + one trailing placeholder.
    expect(members(summary as UnionType)).toBe(UNION_ELISION_PREVIEW_COUNT + 1);
    // The trailing member renders as the placeholder symbol.
    expect(summary.toWordplay()).toContain(PLACEHOLDER_SYMBOL);
});

test('rewrites a union nested inside a larger node, leaving the rest intact', () => {
    const arms = Array.from(
        { length: UNION_ELISION_THRESHOLD + 3 },
        (_, i) => `"${i}"`,
    ).join('|');
    // A list type whose item type is a long union: [ "0"|"1"|… ]
    const type = parseType(toTokens(`[${arms}]`));
    const summary = summarizeUnionTypes(type);

    // Still a list type (root unchanged), but its inner union is summarized.
    expect(summary.constructor).toBe(type.constructor);
    // The outermost union (not contained in another) holds the preview arms
    // plus the placeholder. (nodes() is post-order, so don't rely on index.)
    const unions = summary.nodes(
        (n): n is UnionType => n instanceof UnionType,
    );
    const outer = unions.find(
        (u) => !unions.some((other) => other !== u && other.contains(u)),
    );
    expect(outer && members(outer)).toBe(UNION_ELISION_PREVIEW_COUNT + 1);
    // Exactly one placeholder stands in for the omitted members.
    expect(
        summary.nodes(
            (n): n is TypePlaceholder => n instanceof TypePlaceholder,
        ).length,
    ).toBe(1);
});
