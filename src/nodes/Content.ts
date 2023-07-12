import type Locale from '../locale/Locale';
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
        locale: Locale,
        inputs: TemplateInput[]
    ): Content | Token | NodeRef | ValueRef | undefined;

    abstract toText(): string;
}
