import { expect, test } from 'vitest';
import checkSingleArmBranches from './checkSingleArmBranches';

test('accepts branches with both arms', () => {
    expect(checkSingleArmBranches('$name[named $name|]')).toEqual([]);
    expect(checkSingleArmBranches('before $after[$after|end]')).toEqual([]);
    // A mention with no branch at all is fine; other checks cover missing inputs.
    expect(checkSingleArmBranches('Say $text')).toEqual([]);
    // Bracketed prose not attached to a mention isn't a branch.
    expect(checkSingleArmBranches('see the guide [here]')).toEqual([]);
});

test('flags a branch with only one arm', () => {
    expect(
        checkSingleArmBranches('$blur[shadow blurred $blur pixels]'),
    ).toEqual(['$blur[shadow blurred $blur pixels]']);
    // Every occurrence is reported, so one message covers the whole string.
    expect(
        checkSingleArmBranches('$before[start] and $after[end]'),
    ).toHaveLength(2);
});

test('exempts count branches, whose arms are plural forms', () => {
    // Japanese has a single plural form, so one arm is correct.
    expect(checkSingleArmBranches('$#words[$words 語]')).toEqual([]);
    // English has two.
    expect(
        checkSingleArmBranches('$#count[$count value|$count values]'),
    ).toEqual([]);
});

test('reads a nested branch as belonging to the inner mention', () => {
    // The inner branch supplies the `|`; the outer one still has none.
    expect(
        checkSingleArmBranches('$name[I know $scope[$scope|no one] here]'),
    ).toEqual(['$name[I know $scope[$scope|no one] here]']);
    // Both arms present at the outer level, so only the inner is examined.
    expect(
        checkSingleArmBranches('$name[I know $scope[$scope|no one]|nothing]'),
    ).toEqual([]);
});
