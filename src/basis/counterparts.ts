import type { Basis } from '@basis/Basis';
import Bind from '@nodes/Bind';
import ConversionDefinition from '@nodes/ConversionDefinition';
import FunctionDefinition from '@nodes/FunctionDefinition';
import type Node from '@nodes/Node';
import StreamDefinition from '@nodes/StreamDefinition';
import StructureDefinition from '@nodes/StructureDefinition';

/**
 * Pair every built-in definition in one basis with the same definition in another basis
 * built for different locales, so a definition's documentation can be read in a language
 * its own basis was never built with.
 *
 * The two bases are built by the same code from the same structure, so they can be walked
 * in parallel — but only along the structural spine. `Names` and `Docs` hold one entry per
 * locale, so those subtrees differ in size between the two and must never be walked.
 *
 * Returns undefined if anything fails to line up. Pairing the wrong two definitions would
 * show one built-in's documentation under another's name, which is worse than showing a
 * reader documentation in a language they didn't choose.
 */
export default function buildCounterparts(
    mine: Basis,
    theirs: Basis,
): Map<Node, Node> | undefined {
    const map = new Map<Node, Node>();
    let aligned = true;

    function pairList<Kind extends Node>(
        a: Kind[],
        b: Kind[],
        pair: (x: Kind, y: Kind) => void,
    ) {
        if (a.length !== b.length) {
            aligned = false;
            return;
        }
        a.forEach((item, index) => {
            const other = b[index];
            if (other !== undefined) pair(item, other);
        });
    }

    function pairBind(a: Bind, b: Bind) {
        map.set(a, b);
    }

    function pairFunction(a: FunctionDefinition, b: FunctionDefinition) {
        map.set(a, b);
        pairList(a.inputs, b.inputs, pairBind);
    }

    function pairStream(a: StreamDefinition, b: StreamDefinition) {
        map.set(a, b);
        pairList(a.inputs, b.inputs, pairBind);
    }

    function pairStructure(a: StructureDefinition, b: StructureDefinition) {
        map.set(a, b);
        pairList(a.inputs, b.inputs, pairBind);
        pairList(
            a.expression?.statements ?? [],
            b.expression?.statements ?? [],
            pairStatement,
        );
    }

    function pairStatement(a: Node, b: Node) {
        if (a instanceof FunctionDefinition && b instanceof FunctionDefinition)
            pairFunction(a, b);
        else if (
            a instanceof ConversionDefinition &&
            b instanceof ConversionDefinition
        )
            // A conversion has no named inputs, so there is nothing below it to pair.
            map.set(a, b);
        else if (a instanceof Bind && b instanceof Bind) pairBind(a, b);
        else if (
            a instanceof StructureDefinition &&
            b instanceof StructureDefinition
        )
            pairStructure(a, b);
        // Anything else in a basis block carries no docs of its own, so it needs no
        // pairing — but two different kinds at one position means the bases diverged.
        else if (a.constructor !== b.constructor) aligned = false;
    }

    function pairShare(a: Node, b: Node) {
        if (a instanceof StreamDefinition && b instanceof StreamDefinition)
            pairStream(a, b);
        else pairStatement(a, b);
    }

    // Structures are keyed by a basis type name ('measurement', 'text', …), which is code,
    // not locale text, so the keys are the same in both.
    const kinds = Object.keys(mine.structureDefinitionsByName);
    const theirKinds = Object.keys(theirs.structureDefinitionsByName);
    if (kinds.length !== theirKinds.length) return undefined;
    for (const kind of kinds) {
        const a = mine.structureDefinitionsByName[kind];
        const b = theirs.structureDefinitionsByName[kind];
        if (a === undefined || b === undefined) return undefined;
        pairStructure(a, b);
    }

    // Shares (streams and output types) come from one literal in `createDefaultShares`,
    // so both bases list them in the same order; `pairShare` still checks each kind.
    pairList(mine.shares.all, theirs.shares.all, pairShare);

    return aligned ? map : undefined;
}
