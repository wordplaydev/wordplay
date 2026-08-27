import type Project from '@db/projects/Project';
import Evaluate from '@nodes/Evaluate';
import Expression from '@nodes/Expression';
import Input from '@nodes/Input';
import StructureValue from '@values/StructureValue';
import type Value from '@values/Value';

/**
 * The expression an output's own `Evaluate` bound to the input holding the
 * given value, or nothing when there isn't one in the project.
 *
 * `Value.creator` names whatever *directly* produced a value, which is often
 * something the creator can't see: a predefined animation builds its poses in a
 * function body that `toStructure` parsed, and arithmetic produces its number
 * from the basis' internal `+`. Neither belongs to a `Source`, so the editor
 * discards them and the feedback silently disappears. The call site is the
 * nearest thing the creator actually wrote, so it stands in.
 *
 * Matched by value identity rather than by bind name or input index, so this
 * stays independent of the locale that named the input and of each output
 * type's own input order.
 */
export function getInputExpression(
    project: Project,
    structure: Value,
    input: Value | undefined,
): Expression | undefined {
    if (input === undefined) return undefined;

    const evaluate = structure.creator;
    if (
        !(evaluate instanceof Evaluate) ||
        !(structure instanceof StructureValue) ||
        !project.contains(evaluate)
    )
        return undefined;

    const bind = structure.type.inputs.find(
        (candidate) => structure.resolve(candidate.names) === input,
    );
    if (bind === undefined) return undefined;

    const given = evaluate.getMappingFor(
        bind,
        project.getNodeContext(evaluate),
    )?.given;
    const expression = given instanceof Input ? given.value : given;
    return expression instanceof Expression && project.contains(expression)
        ? expression
        : undefined;
}
