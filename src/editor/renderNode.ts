import type Node from "../nodes/Node";
import UnparsableView from "./UnparsableView.svelte";
import TokenView from "./TokenView.svelte";
import UnknownNodeView from "./UnknownNodeView.svelte";
import BlockView from "./BlockView.svelte";
import BorrowView from "./BorrowView.svelte";
import BindView from "./BindView.svelte";
import AliasView from "./AliasView.svelte";
import LanguageView from "./LanguageView.svelte";
import StructureDefinitionView from "./StructureDefinitionView.svelte";
import ListLiteralView from "./ListLiteralView.svelte";
import TextLiteralView from "./TextLiteralView.svelte";

export default function renderNode(node: Node) {
    const view = {
        "Token": TokenView,
        "Unparsable": UnparsableView,
        "Block": BlockView,
        "Borrow": BorrowView,
        "Bind": BindView,
        "Alias": AliasView,
        "Language": LanguageView,
        "StructureDefinition": StructureDefinitionView,
        "ListLiteral": ListLiteralView,
        "TextLiteral": TextLiteralView
    }[node.constructor.name];
    return view === undefined ? UnknownNodeView : view;
}