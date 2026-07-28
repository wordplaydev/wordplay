import type Locales from '@locale/Locales';
import type { TemplateInput } from '@locale/Locales';
import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import Expression from '@nodes/Expression';
import ListLiteral from '@nodes/ListLiteral';
import Literal from '@nodes/Literal';
import MapLiteral from '@nodes/MapLiteral';
import type Node from '@nodes/Node';
import Convert from '@nodes/Convert';
import ConversionDefinition from '@nodes/ConversionDefinition';
import Reference from '@nodes/Reference';
import SetLiteral from '@nodes/SetLiteral';
import TableLiteral from '@nodes/TableLiteral';
import Type from '@nodes/Type';

/**
 * A short spoken reference to a child node, for use in node descriptions.
 *
 * Descriptions embed references to their children, and a child's FULL
 * description nests sentences inside sentences ("mapping key text 'a' to
 * value evaluate Phrase..."), which a listener can't parse. The consistent
 * rule, per #1248's follow-ups: a literal reads as what it is (its own
 * description is a short noun phrase), a reference reads as its name, and any
 * other expression reads as its static type. Types read as themselves.
 */
export default function conciseRef(
    node: Node,
    locales: Locales,
    context: Context,
): TemplateInput {
    // Literals (including collection literals) describe themselves concisely.
    if (
        node instanceof Literal ||
        node instanceof ListLiteral ||
        node instanceof SetLiteral ||
        node instanceof MapLiteral ||
        node instanceof TableLiteral
    )
        return new NodeRef(node, locales, context);
    // A reference is its (non-symbolic) name.
    if (node instanceof Reference) {
        const definition = node.resolve(context);
        return definition
            ? locales.getName(definition.names, false)
            : node.getName();
    }
    // Any other expression is summarized by its static type.
    if (node instanceof Expression)
        return new NodeRef(node.getType(context), locales, context);
    // A type reads as itself; anything else falls back to its description.
    if (node instanceof Type) return new NodeRef(node, locales, context);
    return new NodeRef(node, locales, context);
}

/**
 * Whether announcing this node's static type alongside its description is
 * redundant: an atomic literal's description IS its value and type ("number 1,
 * number type" says number twice), and a conversion already names its target
 * type ("convert number 1 to text type, text type").
 */
export function describesOwnType(node: Node): boolean {
    return (
        node instanceof Literal ||
        node instanceof Convert ||
        node instanceof ConversionDefinition
    );
}
