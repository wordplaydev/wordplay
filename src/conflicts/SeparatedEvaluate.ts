import type Context from '@nodes/Context';
import NodeRef from '@locale/NodeRef';
import Conflict from './Conflict';
import type Locales from '../locale/Locales';
import type Block from '@nodes/Block';
import type Reference from '@nodes/Reference';

export default class SeparatedEvaluate extends Conflict {
    readonly name: Reference;
    readonly inputs: Block;
    readonly structure: boolean;

    constructor(name: Reference, inputs: Block, structure: boolean) {
        super(false);

        this.name = name;
        this.inputs = inputs;
        this.structure = structure;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.name,
                explanation: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) => l.node.Evaluate.conflict.SeparatedEvaluate,
                        new NodeRef(this.name, locales, context),
                        this.structure,
                    ),
            },
        };
    }
}
