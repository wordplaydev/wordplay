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
import ListTypeView from "./ListTypeView.svelte";
import TextTypeView from "./TextTypeView.svelte";
import NameTypeView from "./NameTypeView.svelte";
import ConditionalView from "./ConditionalView.svelte";
import TypeVariableView from "./TypeVariableView.svelte";
import EvaluateView from "./EvaluateView.svelte";
import NameView from "./NameView.svelte";
import BinaryOperationView from "./BinaryOperationView.svelte";
import MeasurementLiteralView from "./MeasurementLiteralView.svelte";
import UnitView from "./UnitView.svelte";
import TemplateView from "./TemplateView.svelte";
import ConvertView from "./ConvertView.svelte";
import AccessNameView from "./AccessNameView.svelte";
import FunctionDefinitionView from "./FunctionDefinitionView.svelte";
import ReactionView from "./ReactionView.svelte";
import UnaryOperationView from "./UnaryOperationView.svelte";
import BooleanLiteralView from "./BooleanLiteralView.svelte";
import BooleanTypeView from "./BooleanTypeView.svelte";
import ExpressionPlaceholderView from "./ExpressionPlaceholderView.svelte";
import TypePlaceholderView from "./TypePlaceholderView.svelte";
import NoneLiteralView from "./NoneLiteralView.svelte";
import NoneTypeView from "./NoneTypeView.svelte";
import MeasurementTypeView from "./MeasurementTypeView.svelte";
import ShareView from "./ShareView.svelte";
import SetOrMapLiteralView from "./SetOrMapLiteralView.svelte";
import KeyValueView from "./KeyValueView.svelte";
import SetOrMapAccessView from "./SetOrMapAccessView.svelte";
import SetOrMapTypeView from "./SetOrMapTypeView.svelte";
import ListAccessView from "./ListAccessView.svelte";
import ConversionDefinitionView from "./ConversionDefinitionView.svelte";
import PreviousView from "./PreviousView.svelte";
import StreamTypeView from "./StreamTypeView.svelte";
import IsView from "./IsView.svelte";
import UnionTypeView from "./UnionTypeView.svelte";

export default function renderNode(node: Node) {
    const view = {
        "Token": TokenView,
        "Unparsable": UnparsableView,
        "Borrow": BorrowView,
        "Share": ShareView,
        "Block": BlockView,
        "Bind": BindView,
        "Alias": AliasView,
        "Language": LanguageView,
        "StructureDefinition": StructureDefinitionView,
        "AccessName": AccessNameView,
        "TextLiteral": TextLiteralView,
        "TextType": TextTypeView,
        "NameType": NameTypeView,
        "Conditional": ConditionalView,
        "TypeVariable": TypeVariableView,
        "Evaluate": EvaluateView,
        "Name": NameView,
        "BinaryOperation": BinaryOperationView,
        "MeasurementLiteral": MeasurementLiteralView,
        "Unit": UnitView,
        "Template": TemplateView,
        "Convert": ConvertView,
        "ConversionDefnition": ConversionDefinitionView,
        "FunctionDefinition": FunctionDefinitionView,
        "Reaction": ReactionView,
        "Previous": PreviousView,
        "StreamType": StreamTypeView,
        "UnaryOperation": UnaryOperationView,
        "BooleanLiteral": BooleanLiteralView,
        "BooleanType": BooleanTypeView,
        "ExpressionPlaceholder": ExpressionPlaceholderView,
        "TypePlaceholder": TypePlaceholderView,
        "NoneLiteral": NoneLiteralView,
        "NoneType": NoneTypeView,
        "MeasurementType": MeasurementTypeView,
        "SetOrMapLiteral": SetOrMapLiteralView,
        "KeyValue": KeyValueView,
        "SetOrMapAccess": SetOrMapAccessView,
        "SetOrMapType": SetOrMapTypeView,
        "ListLiteral": ListLiteralView,
        "ListAccess": ListAccessView,
        "ListType": ListTypeView,
        "UnionType": UnionTypeView,
        "Is": IsView
    }[node.constructor.name];
    return view === undefined ? UnknownNodeView : view;
}