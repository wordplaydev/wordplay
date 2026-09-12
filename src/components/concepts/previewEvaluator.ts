/**
 * Shared construction for doc/guide preview evaluators (OutputPreview's
 * self-contained mode and ExampleUI), so the two components build their
 * projects and evaluators — and document the reactivity contract — in one
 * place.
 */
import type { ExampleScope } from '@components/project/Contexts';
import type { Database } from '@db/Database';
import Project from '@db/projects/Project';
import type LocaleText from '@locale/LocaleText';
import type Program from '@nodes/Program';
import Source from '@nodes/Source';
import type Spaces from '@parser/Spaces';
import Evaluator from '@runtime/Evaluator';

/**
 * Make a project for a markup example's program — self-contained by default, which is
 * what an ordinary doc or how-to example is.
 *
 * A `scope` makes it not: a kit's examples name the kit's own definitions, which an
 * example built from itself alone resolves none of. See {@link ExampleScope}.
 */
export function makeExampleProject(
    name: string,
    program: Program,
    spaces: Spaces,
    locales: LocaleText[],
    scope?: ExampleScope | undefined,
): Project {
    const project =
        scope === undefined
            ? Project.make(
                  null,
                  name,
                  new Source(name, [program, spaces]),
                  [],
                  locales,
              )
            : Project.make(
                  null,
                  name,
                  // Built from text rather than from the parsed program, because the
                  // prelude has to be parsed as part of the same source for its borrow to
                  // bind anything in it.
                  new Source(
                      name,
                      `${scope.prelude}\n${program.toWordplay(spaces)}`,
                  ),
                  [],
                  locales,
              );
    return scope === undefined
        ? project
        : project.withDependencies(scope.dependencies);
}

/**
 * Construct a preview evaluator in the given reactivity mode. Previews should
 * start **non-reactive** so the static first frame (getInitialValue) evaluates
 * without starting any streams — crucially, without claiming the mic/camera
 * (AudioStream/CameraFeed only call getUserMedia when reactive). The
 * `reactive` flag is immutable, so when the viewer presses play, recreate the
 * evaluator reactive — that is the moment native streams initialize — and
 * recreate it non-reactive again on stop to release them.
 */
export function makePreviewEvaluator(
    project: Project,
    database: Database,
    locales: LocaleText[],
    reactive: boolean,
): Evaluator {
    return new Evaluator(project, database, locales, reactive);
}
