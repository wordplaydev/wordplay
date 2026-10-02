import type ConceptRef from '#locale/ConceptRef.ts';
import type Locales from '#locale/Locales.ts';
import type { TemplateInput } from '#locale/Locales.ts';
import type NodeRef from '#locale/NodeRef.ts';
import type TermRef from '#locale/TermRef.ts';
import type ValueRef from '#locale/ValueRef.ts';
import Node from '#nodes/Node.ts';
import type Token from '#nodes/Token.ts';

/** Represents a part of Markup */
export default abstract class Content extends Node {
    constructor() {
        super();
    }

    abstract concretize(
        locales: Locales,
        inputs: Record<string, TemplateInput>,
        /** A mutable list of token replacements, to preserve preceding space after modifications */
        replacements: [Node, Node][],
    ): Content | Token | NodeRef | ValueRef | ConceptRef | TermRef | undefined;

    abstract toText(): string;
}
