import type Locales from '../locale/Locales';
import type NodeRef from '../locale/NodeRef';
import type ValueRef from '../locale/ValueRef';
import type { TemplateInput } from '../locale/concretize';
import Node from './Node';
import type Token from './Token';

/** Represents a part of Markup */
export default abstract class Content extends Node {
    constructor() {
        super();
    }

    abstract concretize(
        locales: Locales,
        inputs: TemplateInput[],
        /** A mutable list of token replacements, to preserve preceding space after modifications */
        replacements: [Node, Node][]
    ): Content | Token | NodeRef | ValueRef | undefined;

    abstract toText(): string;
}
