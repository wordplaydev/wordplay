import type Context from '@nodes/Context';
import type Node from '@nodes/Node';
import type Type from '@nodes/Type';

type EditContext = {
    node: Node;
    context: Context;
    type: Type | undefined;
};

export type { EditContext as default };
