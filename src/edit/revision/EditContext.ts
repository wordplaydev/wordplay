import type ConceptIndex from '@concepts/ConceptIndex';
import type Locales from '@locale/Locales';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';
import type Type from '@nodes/Type';

/** The values that are constant across a single getEditsAt invocation, bundled
 *  so the menu helpers can thread them as one object instead of many arguments. */
export type EditContext = {
    /** The context of the edit */
    context: Context;
    /** Locales currently in use */
    locales: Locales;
    /** The concept index, when available, for completing concept links in markup. */
    concepts?: ConceptIndex | undefined;
    /** Available custom character names, when available, for recommending characters in markup and formatted text. */
    characters?: string[] | undefined;
};

type BaseContext = EditContext & {
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
