import { test, expect, describe } from 'vitest';
// Populate the type-resolution registry. `vitest.config.ts` already lists this
// file in `setupFiles`, but some IDE vitest runners invoke individual test
// files without honouring that config — the explicit side-effect import keeps
// the test green regardless of the invocation path.
import '@conflicts/registerTypeResolutions';
import Conflict, {
    ConflictSeverity,
    registerResolver,
    type Repair,
    type Resolutions,
} from '@conflicts/Conflict';
import type LocaleText from '@locale/LocaleText';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';
import Markup from '@nodes/Markup';
import Token from '@nodes/Token';
import { Sym } from '@nodes/Sym';
import IncompatibleType from '@conflicts/IncompatibleType';

/**
 * A real project, for the `Context` and `Project` the resolution types require.
 * Imported lazily, since the node and database modules it needs are heavy and
 * the registry itself does not depend on them.
 */
async function fixture() {
    const { default: Source } = await import('@nodes/Source');
    const { default: Project } = await import('@db/projects/Project');
    const { default: DefaultLocale } = await import('@locale/DefaultLocale');
    const source = new Source('test', `a•'': 5`);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    return { source, project, context: project.getContext(source) };
}

/** A node to hang a fake conflict on; any node will do, so the cheapest one. */
const fakeNode = new Token('x', Sym.Name);

// Tiny fake conflict that doesn't touch any real node infrastructure.
// Delegates resolution lookup to the registry, like the cycle-sensitive
// type-mismatch conflicts do.
class FakeConflict extends Conflict {
    constructor() {
        super(ConflictSeverity.Error);
    }
    override getResolutions(context: Context, concepts: Node[]): Resolutions {
        return Conflict.fromRegistry(this, context, concepts);
    }
    getMessage() {
        return {
            node: fakeNode,
            explanation: () => Markup.words('a fake conflict'),
        };
    }
    getLocalePath() {
        return (locale: LocaleText) => locale.node.This.conflict.MisplacedThis;
    }
}

class UnregisteredFakeConflict extends FakeConflict {}

describe('Conflict resolver registry', () => {
    test('a registered resolver is invoked by getResolutions', async () => {
        const { project, context } = await fixture();
        const sentinel: Repair = {
            kind: 'repair',
            description: () => Markup.words('a fake repair'),
            mediator: () => ({ newProject: project }),
        };
        registerResolver(FakeConflict, () => [sentinel]);
        const c = new FakeConflict();
        const result = c.getResolutions(context, []);
        expect(result.length).toBeGreaterThan(0);
        expect(result[0]).toBe(sentinel);
    });

    test('an unregistered conflict still returns a non-empty list (synthesised explainer)', async () => {
        const { context } = await fixture();
        // Override the FakeConflict's stub message with one that has a real
        // explanation function so the explainer fallback works.
        const explanation = () => Markup.words('fallback');
        class WithMessage extends UnregisteredFakeConflict {
            override getMessage() {
                return { node: fakeNode, explanation };
            }
        }
        const c = new WithMessage();
        const result = c.getResolutions(context, []);
        expect(result.length).toBe(1);
        expect(result[0].kind).toBe('explain');
    });

    test('registerTypeResolutions populates IncompatibleType (loaded via vitest setupFiles)', async () => {
        // Build a minimal IncompatibleType via a parsed source — easier than
        // mocking out the full constructor. If the registry was populated by
        // setupFiles, getResolutions on a real conflict should be non-empty
        // for a fixable case (Number value bound to text — Convert applies).
        const { project, context } = await fixture();
        const conflict = project
            .analyze()
            .conflicts.find(
                (c): c is IncompatibleType => c instanceof IncompatibleType,
            );
        expect(conflict).toBeDefined();
        if (conflict) {
            const resolutions = conflict.getResolutions(context, []);
            expect(resolutions.length).toBeGreaterThan(0);
        }
    });
});
