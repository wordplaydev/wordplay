import { test, expect, describe } from 'vitest';
import Conflict, {
    registerResolver,
    type Repair,
    type Resolutions,
} from '@conflicts/Conflict';
import type LocaleText from '@locale/LocaleText';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';
import type Locales from '@locale/Locales';
import type Markup from '@nodes/Markup';
import type { ConflictText } from '@locale/NodeTexts';
import IncompatibleType from '@conflicts/IncompatibleType';

// Tiny fake conflict that doesn't touch any real node infrastructure.
// Delegates resolution lookup to the registry, like the cycle-sensitive
// type-mismatch conflicts do.
class FakeConflict extends Conflict {
    constructor() {
        super(false);
    }
    override getResolutions(
        context: Context,
        concepts: Node[],
    ): Resolutions {
        return Conflict.fromRegistry(this, context, concepts);
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
        const sentinel: Repair = {
            kind: 'repair',
            description: () => undefined as unknown as Markup,
            mediator: () => ({
                newProject: undefined as unknown as ReturnType<
                    Repair['mediator']
                >['newProject'],
            }),
        };
        registerResolver(FakeConflict, () => [sentinel]);
        const c = new FakeConflict();
        const result = c.getResolutions(
            undefined as unknown as Context,
            [],
        );
        expect(result.length).toBeGreaterThan(0);
        expect(result[0]).toBe(sentinel);
    });

    test('an unregistered conflict still returns a non-empty list (synthesised explainer)', () => {
        // Override the FakeConflict's stub message with one that has a real
        // explanation function so the explainer fallback works.
        const explanation = (_l: Locales, _c: Context) =>
            'fallback' as unknown as Markup;
        const fakeNode = {} as unknown as Node;
        class WithMessage extends UnregisteredFakeConflict {
            override getMessage() {
                return { node: fakeNode, explanation };
            }
        }
        const c = new WithMessage();
        const result = c.getResolutions(
            undefined as unknown as Context,
            [],
        );
        expect(result.length).toBe(1);
        expect(result[0].kind).toBe('explain');
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
