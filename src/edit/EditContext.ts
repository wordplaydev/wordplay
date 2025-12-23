import type Context from '@nodes/Context';
import type Node from '@nodes/Node';
import type Type from '@nodes/Type';

type BaseContext = {
    /** The context of the edit */
    context: Context;
    /** The type expected for whatever node is suggested */
    type: Type | undefined;
};

export type ReplaceContext = BaseContext & {
    /** The optional node being edited */
    node: Node;
};

export type InsertContext = BaseContext & {
    /** The parent node in which the node is being inserted */
    parent: Node;
    /** The field being inserted into */
    field: string;
    /** The index at which the node is being inserted, if an insert */
    index: number | undefined;
};
