import type ConceptRef from '@locale/ConceptRef';
import type Locales from '../locale/Locales';
import type NodeRef from '../locale/NodeRef';
import type ValueRef from '../locale/ValueRef';
import Node from './Node';
import type Token from './Token';
import type { TemplateInput } from '../locale/Locales';

/** Represents a part of Markup */
export default abstract class Content extends Node {
    constructor() {
        super();
    }

    abstract concretize(
        locales: Locales,
        inputs: TemplateInput[],
        /** A mutable list of token replacements, to preserve preceding space after modifications */
        replacements: [Node, Node][],
    ): Content | Token | NodeRef | ValueRef | ConceptRef | undefined;

    abstract toText(): string;
}
