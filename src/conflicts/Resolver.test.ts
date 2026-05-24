import { test, expect, describe } from 'vitest';
import Conflict, {
    registerResolver,
    type Resolution,
} from '@conflicts/Conflict';
import type LocaleText from '@locale/LocaleText';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';
import type Locales from '@locale/Locales';
import type Markup from '@nodes/Markup';
import type { ConflictText } from '@locale/NodeTexts';
import IncompatibleType from '@conflicts/IncompatibleType';

// Tiny fake conflict that doesn't touch any real node infrastructure.
class FakeConflict extends Conflict {
    constructor() {
        super(false);
    }
    getMessage() {
        return {
            node: undefined as unknown as Node,
            explanation: (_l: Locales, _c: Context) =>
                undefined as unknown as Markup,
        };
    }
    getLocalePath() {
        return (_l: LocaleText) =>
            undefined as unknown as ConflictText<readonly string[]>;
    }
}

class UnregisteredFakeConflict extends FakeConflict {}

describe('Conflict resolver registry', () => {
    test('a registered resolver is invoked by getResolutions', () => {
        const sentinel: Resolution[] = [];
        registerResolver(FakeConflict, () => sentinel);
        const c = new FakeConflict();
        expect(c.getResolutions(
            undefined as unknown as Context,
            [],
        )).toBe(sentinel);
    });

    test('an unregistered conflict returns an empty list', () => {
        const c = new UnregisteredFakeConflict();
        expect(
            c.getResolutions(undefined as unknown as Context, []),
        ).toEqual([]);
    });

    test('registerTypeResolutions populates IncompatibleType (loaded via vitest setupFiles)', () => {
        // Build a minimal IncompatibleType via a parsed source — easier than
        // mocking out the full constructor. If the registry was populated by
        // setupFiles, getResolutions on a real conflict should be non-empty
        // for a fixable case (Number value bound to text — Convert applies).
        // We import lazily here to avoid a top-level dependency on heavy
        // node modules.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return import('@nodes/Source').then(async (S) => {
            const { default: Source } = S;
            const { default: Project } = await import('@db/projects/Project');
            const { default: DefaultLocale } = await import(
                '@locale/DefaultLocale'
            );
            const source = new Source('test', `a•'': 5`);
            const project = Project.make(
                null,
                'test',
                source,
                [],
                DefaultLocale,
            );
            project.analyze();
            const conflict = project
                .getAnalysis()
                .conflicts.find(
                    (c): c is IncompatibleType => c instanceof IncompatibleType,
                );
            expect(conflict).toBeDefined();
            if (conflict) {
                const ctx = project.getContext(source);
                const resolutions = conflict.getResolutions(ctx, []);
                expect(resolutions.length).toBeGreaterThan(0);
            }
        });
    });
});
