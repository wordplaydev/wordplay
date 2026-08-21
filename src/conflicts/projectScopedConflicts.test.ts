import { BorrowCycle } from '@conflicts/BorrowCycle';
import ShadowsKeyword from '@conflicts/ShadowsKeyword';
import { UnknownBorrow } from '@conflicts/UnknownBorrow';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import Borrow from '@nodes/Borrow';
import Program from '@nodes/Program';
import Source from '@nodes/Source';
import { expect, test } from 'vitest';

/**
 * Conflicts that need more than one source, or a project whose keyword input is
 * on, so `testConflict`'s single anonymous source can't express them.
 */

function conflictsOf(main: Source, supplements: Source[] = []): string[] {
    return Project.make(null, 'test', main, supplements, DefaultLocale)
        .analyze()
        .conflicts.map((conflict) => conflict.constructor.name);
}

test('a Borrow of a source that exists is fine, and of one that does not is UnknownBorrow', () => {
    const real = new Source('data', '↑ a: 1\n1');
    expect(
        conflictsOf(new Source('main', '↓ data.a\na'), [real]),
    ).not.toContain(UnknownBorrow.name);
    expect(conflictsOf(new Source('main', '↓ nope\n1'))).toContain(
        UnknownBorrow.name,
    );
    expect(
        new Source('main', '↓ nope\n1')
            .nodes()
            .some((n) => n instanceof Borrow),
    ).toBe(true);
});

test('two sources that borrow each other are a BorrowCycle on the Program', () => {
    // One direction is fine.
    const leaf = new Source('leaf', '↑ a: 1\n1');
    expect(
        conflictsOf(new Source('main', '↓ leaf.a\na'), [leaf]),
    ).not.toContain(BorrowCycle.name);

    // Both directions is not. Program is what reports it, since the cycle is a
    // property of the source's borrows rather than of any one Borrow.
    const there = new Source('there', '↓ main.b\n↑ a: 1\n1');
    const main = new Source('main', '↓ there.a\n↑ b: 2\n1');
    const conflicts = conflictsOf(main, [there]);
    expect(conflicts).toContain(BorrowCycle.name);
    expect(main.nodes().some((n) => n instanceof Program)).toBe(true);
});

test('a name spelled like a keyword is flagged once the project reads keywords', () => {
    const code = 'none: 1\nnone';
    const plain = Project.make(
        null,
        'test',
        new Source('main', code),
        [],
        DefaultLocale,
    );
    // Keyword words are inert until a project re-tokenizes with its keyword
    // index, so the same source is only a shadow after that.
    expect(
        plain.analyze().conflicts.map((c) => c.constructor.name),
    ).not.toContain(ShadowsKeyword.name);

    const keyed = plain.withSource(
        plain.getMain(),
        plain.getMain().withKeywords(plain.getKeywordIndex()),
    );
    expect(keyed.analyze().conflicts.map((c) => c.constructor.name)).toContain(
        ShadowsKeyword.name,
    );
});
