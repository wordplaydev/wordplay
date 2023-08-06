import RequiredAfterOptional from '@conflicts/RequiredAfterOptional';
import InputListMustBeLast from '@conflicts/InputListMustBeLast';
import Bind from './Bind';
import type Node from './Node';
import Token from './Token';
import Symbol from './Symbol';
import DuplicateName from '@conflicts/DuplicateName';

export function requiredBindAfterOptional(
    inputs: Bind[]
): RequiredAfterOptional | undefined {
    const binds = inputs.filter((i) => i instanceof Bind) as Bind[];
    let foundOptional = false;
    let requiredAfterOptional: Bind | undefined = undefined;
    binds.forEach((bind) => {
        if (bind.value !== undefined) foundOptional = true;
        else if (
            bind.value === undefined &&
            foundOptional &&
            requiredAfterOptional === undefined
        )
            requiredAfterOptional = bind;
    });

    return inputs.length === binds.length && requiredAfterOptional !== undefined
        ? new RequiredAfterOptional(requiredAfterOptional)
        : undefined;
}

export function restIsNotLast(inputs: Bind[]) {
    const rest = inputs.find(
        (i) => i instanceof Bind && i.isVariableLength()
    ) as Bind | undefined;
    return rest !== undefined && inputs.indexOf(rest) !== inputs.length - 1
        ? new InputListMustBeLast(rest)
        : undefined;
}

export function getEvaluationInputConflicts(inputs: Bind[]) {
    const conflicts = [];

    // Distinct structure input names must be unique (but individual names are allowed to have
    // redundant names).
    for (const input of inputs) {
        const dupe = inputs.find((i) => i !== input && i.sharesName(input));
        if (dupe) {
            const sharedName = dupe.names.getSharedName(input.names);
            if (sharedName) {
                const thisName = input.names.names.find(
                    (name) => name.getName() === sharedName?.getName()
                );
                if (thisName)
                    conflicts.push(new DuplicateName(input, sharedName));
            }
        }
    }

    // Required inputs can never follow an optional one.
    const requiredAfterOptional = requiredBindAfterOptional(inputs);
    if (requiredAfterOptional) conflicts.push(requiredAfterOptional);

    // Rest arguments must be last
    const restIsntLast = restIsNotLast(inputs);
    if (restIsntLast) conflicts.push(restIsntLast);

    return conflicts;
}

export function endsWithName(node: Node) {
    const tokens = node.nodes((t): t is Token => t instanceof Token);
    return tokens.length > 0 && tokens[tokens.length - 1].isSymbol(Symbol.Name);
}

export function startsWithName(node: Node) {
    const tokens = node.nodes((t): t is Token => t instanceof Token);
    return tokens.length > 0 && tokens[0].isSymbol(Symbol.Name);
}
