import type Project from '#db/projects/Project.ts';
import type Locales from '#locale/Locales.ts';
import Evaluate from '#nodes/Evaluate.ts';
import ListLiteral from '#nodes/ListLiteral.ts';
import Reference from '#nodes/Reference.ts';
import StructureDefinition from '#nodes/StructureDefinition.ts';
import { getTypeOutputProperties } from '#edit/output/OutputProperties.ts';
import OutputProperty from '#edit/output/OutputProperty.ts';

export default function getGroupProperties(
    project: Project,
    locales: Locales,
): OutputProperty[] {
    return [
        new OutputProperty(
            (l) => l.output.Group.layout.names,
            'arrangement',
            true,
            false,
            // The layout is an Evaluate of a type implementing Arrangement (Row/Stack/Grid/Free).
            (expr, context) => {
                if (!(expr instanceof Evaluate)) return false;
                const fun = expr.getFunction(context);
                return (
                    fun instanceof StructureDefinition &&
                    fun.implements(project.shares.output.Arrangement, context)
                );
            },
            (locales) =>
                Evaluate.make(
                    Reference.make(
                        locales.getName(project.shares.output.Stack.names),
                        project.shares.output.Stack,
                    ),
                    [],
                ),
        ),
        new OutputProperty(
            (l) => l.output.Group.content.names,
            'content',
            true,
            false,
            (expr) => expr instanceof ListLiteral,
            () => ListLiteral.make([]),
        ),
        ...getTypeOutputProperties(project, locales),
    ];
}
