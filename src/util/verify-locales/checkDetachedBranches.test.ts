import { expect, test } from 'vitest';
import checkDetachedBranches from './checkDetachedBranches';

test('accepts branches attached to their mention', () => {
    expect(checkDetachedBranches('before $after[$after|end]')).toEqual([]);
    expect(checkDetachedBranches('$size[$size meter |]phrase $text')).toEqual(
        [],
    );
    // No branch at all is fine here; other checks cover missing inputs.
    expect(checkDetachedBranches('$mode mode')).toEqual([]);
    // Bracketed prose without a `|` isn't a branch.
    expect(checkDetachedBranches('$name [see the guide]')).toEqual([]);
});

test('flags a branch detached from its mention', () => {
    expect(checkDetachedBranches('sebelum $after [$after|akhir]')).toEqual([
        '$after [$after|akhir]',
    ]);
    // Every occurrence is reported, so one message covers the whole string.
    expect(
        checkDetachedBranches(
            '$before [$before|start] and $after [$after|end]',
        ),
    ).toHaveLength(2);
});
