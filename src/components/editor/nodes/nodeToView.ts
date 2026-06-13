import type { Component } from 'svelte';

/* eslint-disable @typescript-eslint/ban-types */
import TokenView from '@components/editor/tokens/TokenView.svelte';
import BinaryEvaluateView from '@components/editor/nodes/BinaryEvaluateView.svelte';
import BindView from '@components/editor/nodes/BindView.svelte';
import BlockView from '@components/editor/nodes/BlockView.svelte';
import BooleanLiteralView from '@components/editor/nodes/BooleanLiteralView.svelte';
import BooleanTypeView from '@components/editor/nodes/BooleanTypeView.svelte';
import BorrowView from '@components/editor/nodes/BorrowView.svelte';
import ChangedView from '@components/editor/nodes/ChangedView.svelte';
import ConceptLinkView from '@components/editor/nodes/ConceptLinkView.svelte';
import ConditionalView from '@components/editor/nodes/ConditionalView.svelte';
import ConversionDefinitionView from '@components/editor/nodes/ConversionDefinitionView.svelte';
import ConversionTypeView from '@components/editor/nodes/ConversionTypeView.svelte';
import ConvertView from '@components/editor/nodes/ConvertView.svelte';
import TranslateView from '@components/editor/nodes/TranslateView.svelte';
import DeleteView from '@components/editor/nodes/DeleteView.svelte';
import DimensionView from '@components/editor/nodes/DimensionView.svelte';
import DocView from '@components/editor/nodes/DocView.svelte';
import DocsView from '@components/editor/nodes/DocsView.svelte';
import DocumentedExpressionView from '@components/editor/nodes/DocumentedExpressionView.svelte';
import EvaluateView from '@components/editor/nodes/EvaluateView.svelte';
import ExampleView from '@components/editor/nodes/ExampleView.svelte';
import ExpressionPlaceholderView from '@components/editor/nodes/ExpressionPlaceholderView.svelte';
import FormattedLiteralView from '@components/editor/nodes/FormattedLiteralView.svelte';
import FormattedTranslationView from '@components/editor/nodes/FormattedTranslationView.svelte';
import FormattedTypeView from '@components/editor/nodes/FormattedTypeView.svelte';
import FunctionDefinitionView from '@components/editor/nodes/FunctionDefinitionView.svelte';
import FunctionTypeView from '@components/editor/nodes/FunctionTypeView.svelte';
import InitialView from '@components/editor/nodes/InitialView.svelte';
import InputView from '@components/editor/nodes/InputView.svelte';
import InsertView from '@components/editor/nodes/InsertView.svelte';
import IsLocaleView from '@components/editor/nodes/IsLocaleView.svelte';
import IsView from '@components/editor/nodes/IsView.svelte';
import KeyValueView from '@components/editor/nodes/KeyValueView.svelte';
import LanguageView from '@components/editor/nodes/LanguageView.svelte';
import ListAccessView from '@components/editor/nodes/ListAccessView.svelte';
import ListLiteralView from '@components/editor/nodes/ListLiteralView.svelte';
import ListTypeView from '@components/editor/nodes/ListTypeView.svelte';
import MapLiteralView from '@components/editor/nodes/MapLiteralView.svelte';
import MapTypeView from '@components/editor/nodes/MapTypeView.svelte';
import MarkupView from '@components/editor/nodes/MarkupView.svelte';
import MatchView from '@components/editor/nodes/MatchView.svelte';
import NameTypeView from '@components/editor/nodes/NameTypeView.svelte';
import NameView from '@components/editor/nodes/NameView.svelte';
import NamesView from '@components/editor/nodes/NamesView.svelte';
import NoneLiteralView from '@components/editor/nodes/NoneLiteralView.svelte';
import NoneTypeView from '@components/editor/nodes/NoneTypeView.svelte';
import NumberLiteralView from '@components/editor/nodes/NumberLiteralView.svelte';
import NumberTypeView from '@components/editor/nodes/NumberTypeView.svelte';
import ParagraphView from '@components/editor/nodes/ParagraphView.svelte';
import PreviousView from '@components/editor/nodes/PreviousView.svelte';
import ProgramView from '@components/editor/nodes/ProgramView.svelte';
import PropertyBindView from '@components/editor/nodes/PropertyBindView.svelte';
import PropertyReferenceView from '@components/editor/nodes/PropertyReferenceView.svelte';
import ReactionView from '@components/editor/nodes/ReactionView.svelte';
import ReferenceView from '@components/editor/nodes/ReferenceView.svelte';
import RowView from '@components/editor/nodes/RowView.svelte';
import SelectView from '@components/editor/nodes/SelectView.svelte';
import SetLiteralView from '@components/editor/nodes/SetLiteralView.svelte';
import SetOrMapAccessView from '@components/editor/nodes/SetOrMapAccessView.svelte';
import SetTypeView from '@components/editor/nodes/SetTypeView.svelte';
import SourceView from '@components/editor/nodes/SourceView.svelte';
import SpreadView from '@components/editor/nodes/SpreadView.svelte';
import StreamTypeView from '@components/editor/nodes/StreamTypeView.svelte';
import StructureDefinitionView from '@components/editor/nodes/StructureDefinitionView.svelte';
import StructureTypeView from '@components/editor/nodes/StructureTypeView.svelte';
import TableLiteralView from '@components/editor/nodes/TableLiteralView.svelte';
import TableTypeView from '@components/editor/nodes/TableTypeView.svelte';
import TextLiteralView from '@components/editor/nodes/TextLiteralView.svelte';
import TextTypeView from '@components/editor/nodes/TextTypeView.svelte';
import ThisView from '@components/editor/nodes/ThisView.svelte';
import TranslationView from '@components/editor/nodes/TranslationView.svelte';
import TypeInputsView from '@components/editor/nodes/TypeInputsView.svelte';
import TypePlaceholderView from '@components/editor/nodes/TypePlaceholderView.svelte';
import TypeVariableView from '@components/editor/nodes/TypeVariableView.svelte';
import TypeVariablesView from '@components/editor/nodes/TypeVariablesView.svelte';
import TypeView from '@components/editor/nodes/TypeView.svelte';
import UnaryEvaluateView from '@components/editor/nodes/UnaryEvaluateView.svelte';
import UnionTypeView from '@components/editor/nodes/UnionTypeView.svelte';
import UnitView from '@components/editor/nodes/UnitView.svelte';
import UnknownNodeView from '@components/editor/nodes/UnknownNodeView.svelte';
import UnparsableExpressionView from '@components/editor/nodes/UnparsableExpressionView.svelte';
import UnparsableTypeView from '@components/editor/nodes/UnparsableTypeView.svelte';
import UpdateView from '@components/editor/nodes/UpdateView.svelte';
import WebLinkView from '@components/editor/nodes/WebLinkView.svelte';
import WordsView from '@components/editor/nodes/WordsView.svelte';

import BinaryEvaluate from '@nodes/BinaryEvaluate';
import Bind from '@nodes/Bind';
import Block from '@nodes/Block';
import BooleanLiteral from '@nodes/BooleanLiteral';
import BooleanType from '@nodes/BooleanType';
import Borrow from '@nodes/Borrow';
import Changed from '@nodes/Changed';
import ConceptLink from '@nodes/ConceptLink';
import Conditional from '@nodes/Conditional';
import ConversionDefinition from '@nodes/ConversionDefinition';
import ConversionType from '@nodes/ConversionType';
import Convert from '@nodes/Convert';
import Translate from '@nodes/Translate';
import Delete from '@nodes/Delete';
import Dimension from '@nodes/Dimension';
import Doc from '@nodes/Doc';
import Docs from '@nodes/Docs';
import DocumentedExpression from '@nodes/DocumentedExpression';
import Evaluate from '@nodes/Evaluate';
import Example from '@nodes/Example';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import FormattedLiteral from '@nodes/FormattedLiteral';
import FormattedTranslation from '@nodes/FormattedTranslation';
import FormattedType from '@nodes/FormattedType';
import FunctionDefinition from '@nodes/FunctionDefinition';
import FunctionType from '@nodes/FunctionType';
import Initial from '@nodes/Initial';
import Input from '@nodes/Input';
import Insert from '@nodes/Insert';
import Is from '@nodes/Is';
import IsLocale from '@nodes/IsLocale';
import KeyValue from '@nodes/KeyValue';
import Language from '@nodes/Language';
import ListAccess from '@nodes/ListAccess';
import ListLiteral from '@nodes/ListLiteral';
import ListType from '@nodes/ListType';
import MapLiteral from '@nodes/MapLiteral';
import MapType from '@nodes/MapType';
import Markup from '@nodes/Markup';
import Match from '@nodes/Match';
import Name from '@nodes/Name';
import NameType from '@nodes/NameType';
import Names from '@nodes/Names';
import type Node from '@nodes/Node';
import NoneLiteral from '@nodes/NoneLiteral';
import NoneType from '@nodes/NoneType';
import NumberLiteral from '@nodes/NumberLiteral';
import NumberType from '@nodes/NumberType';
import Otherwise from '@nodes/Otherwise';
import Paragraph from '@nodes/Paragraph';
import Previous from '@nodes/Previous';
import Program from '@nodes/Program';
import PropertyBind from '@nodes/PropertyBind';
import PropertyReference from '@nodes/PropertyReference';
import Reaction from '@nodes/Reaction';
import Reference from '@nodes/Reference';
import Row from '@nodes/Row';
import Select from '@nodes/Select';
import SetLiteral from '@nodes/SetLiteral';
import SetOrMapAccess from '@nodes/SetOrMapAccess';
import SetType from '@nodes/SetType';
import Source from '@nodes/Source';
import Spread from '@nodes/Spread';
import StreamType from '@nodes/StreamType';
import StructureDefinition from '@nodes/StructureDefinition';
import StructureType from '@nodes/StructureType';
import TableLiteral from '@nodes/TableLiteral';
import TableType from '@nodes/TableType';
import TextLiteral from '@nodes/TextLiteral';
import TextType from '@nodes/TextType';
import This from '@nodes/This';
import Token from '@nodes/Token';
import Translation from '@nodes/Translation';
import Type from '@nodes/Type';
import TypeInputs from '@nodes/TypeInputs';
import TypePlaceholder from '@nodes/TypePlaceholder';
import TypeVariable from '@nodes/TypeVariable';
import TypeVariables from '@nodes/TypeVariables';
import UnaryEvaluate from '@nodes/UnaryEvaluate';
import UnionType from '@nodes/UnionType';
import Unit from '@nodes/Unit';
import UnparsableExpression from '@nodes/UnparsableExpression';
import UnparsableType from '@nodes/UnparsableType';
import Update from '@nodes/Update';
import VariableType from '@nodes/VariableType';
import WebLink from '@nodes/WebLink';
import Words from '@nodes/Words';
import type { Format } from '@components/editor/nodes/NodeView.svelte';
import NoneOrView from '@components/editor/nodes/OtherwiseView.svelte';
import VariableTypeView from '@components/editor/nodes/VariableTypeView.svelte';

type NodeViewComponent = Component<{
    node: any;
    format: Format;
    /** Whether this node is folded; views that support code folding render a
     *  collapsed header when true. Ignored by views that don't. */
    folded?: boolean;
}>;

// Block styling for each view
type BlockKind =
    | 'plain'
    | 'definition'
    | 'reference'
    | 'data'
    | 'evaluate'
    | 'type'
    | 'predicate'
    | 'doc'
    | 'none';

type BlockStyle = {
    /** The visual appearance of the block. */
    kind: BlockKind;
    /** Whether the layout is block or inline */
    direction: 'block' | 'inline';
    /** Whether the font size is small */
    size: 'normal' | 'small';
};

type BlockConfig = { component: NodeViewComponent; style: BlockStyle };

const nodeToView = new Map<Function & { prototype: Node }, BlockConfig>();

function map<Kind extends Node>(
    nodeType: Function & { prototype: Kind },
    component: NodeViewComponent,
    style: BlockStyle,
) {
    nodeToView.set(nodeType, { component, style });
}

map(Token, TokenView, { kind: 'none', direction: 'inline', size: 'normal' });
map(Source, SourceView, { kind: 'none', direction: 'block', size: 'normal' });
map(Program, ProgramView, {
    kind: 'none',
    direction: 'block',
    size: 'normal',
});
map(Doc, DocView, { kind: 'none', direction: 'inline', size: 'normal' });
map(Docs, DocsView, { kind: 'doc', direction: 'inline', size: 'normal' });
map(Paragraph, ParagraphView, {
    kind: 'none',
    direction: 'inline',
    size: 'normal',
});
map(WebLink, WebLinkView, {
    kind: 'plain',
    direction: 'inline',
    size: 'normal',
});
map(ConceptLink, ConceptLinkView, {
    kind: 'plain',
    direction: 'inline',
    size: 'normal',
});
map(Words, WordsView, {
    kind: 'none',
    direction: 'inline',
    size: 'normal',
});
map(DocumentedExpression, DocumentedExpressionView, {
    kind: 'none',
    direction: 'block',
    size: 'normal',
});
map(Example, ExampleView, {
    kind: 'plain',
    direction: 'inline',
    size: 'normal',
});
map(Markup, MarkupView, {
    kind: 'none',
    direction: 'inline',
    size: 'normal',
});
map(FormattedLiteral, FormattedLiteralView, {
    kind: 'plain',
    direction: 'inline',
    size: 'normal',
});
map(FormattedTranslation, FormattedTranslationView, {
    kind: 'none',
    direction: 'inline',
    size: 'normal',
});

map(Borrow, BorrowView, {
    kind: 'plain',
    direction: 'inline',
    size: 'normal',
});

map(Block, BlockView, {
    kind: 'plain',
    direction: 'inline',
    size: 'normal',
});

map(Bind, BindView, {
    kind: 'definition',
    direction: 'block',
    size: 'normal',
});
map(Name, NameView, {
    kind: 'none',
    direction: 'inline',
    size: 'normal',
});
map(Names, NamesView, {
    kind: 'none',
    direction: 'inline',
    size: 'normal',
});
map(Language, LanguageView, {
    kind: 'type',
    direction: 'inline',
    size: 'small',
});
map(Reference, ReferenceView, {
    kind: 'reference',
    direction: 'inline',
    size: 'normal',
});

map(StructureDefinition, StructureDefinitionView, {
    kind: 'definition',
    direction: 'block',
    size: 'normal',
});
map(PropertyReference, PropertyReferenceView, {
    kind: 'plain',
    direction: 'inline',
    size: 'normal',
});
map(PropertyBind, PropertyBindView, {
    kind: 'definition',
    direction: 'inline',
    size: 'normal',
});
map(NameType, NameTypeView, {
    kind: 'type',
    direction: 'inline',
    size: 'small',
});

map(TypeVariables, TypeVariablesView, {
    kind: 'type',
    direction: 'inline',
    size: 'normal',
});
map(TypeVariable, TypeVariableView, {
    kind: 'type',
    direction: 'inline',
    size: 'small',
});
map(TypeInputs, TypeInputsView, {
    kind: 'type',
    direction: 'inline',
    size: 'small',
});
map(VariableType, VariableTypeView, {
    kind: 'plain',
    direction: 'inline',
    size: 'normal',
});

map(TextLiteral, TextLiteralView, {
    kind: 'plain',
    direction: 'inline',
    size: 'normal',
});
map(Translation, TranslationView, {
    kind: 'none',
    direction: 'inline',
    size: 'normal',
});
map(TextType, TextTypeView, {
    kind: 'type',
    direction: 'inline',
    size: 'small',
});

map(FunctionDefinition, FunctionDefinitionView, {
    kind: 'definition',
    direction: 'block',
    size: 'normal',
});
map(FunctionType, FunctionTypeView, {
    kind: 'type',
    direction: 'inline',
    size: 'small',
});
map(Evaluate, EvaluateView, {
    kind: 'evaluate',
    direction: 'inline',
    size: 'normal',
});
map(Input, InputView, {
    kind: 'definition',
    direction: 'inline',
    size: 'normal',
});
map(ExpressionPlaceholder, ExpressionPlaceholderView, {
    kind: 'plain',
    direction: 'inline',
    size: 'normal',
});
map(BinaryEvaluate, BinaryEvaluateView, {
    kind: 'evaluate',
    direction: 'inline',
    size: 'normal',
});
map(UnaryEvaluate, UnaryEvaluateView, {
    kind: 'evaluate',
    direction: 'inline',
    size: 'normal',
});

map(Convert, ConvertView, {
    kind: 'evaluate',
    direction: 'inline',
    size: 'normal',
});
map(Translate, TranslateView, {
    kind: 'evaluate',
    direction: 'inline',
    size: 'normal',
});
map(ConversionDefinition, ConversionDefinitionView, {
    kind: 'definition',
    direction: 'inline',
    size: 'normal',
});
map(ConversionType, ConversionTypeView, {
    kind: 'type',
    direction: 'inline',
    size: 'small',
});
map(Conditional, ConditionalView, {
    kind: 'predicate',
    direction: 'block',
    size: 'normal',
});
map(Otherwise, NoneOrView, {
    kind: 'plain',
    direction: 'inline',
    size: 'normal',
});
map(Match, MatchView, {
    kind: 'predicate',
    direction: 'block',
    size: 'normal',
});

map(NumberLiteral, NumberLiteralView, {
    kind: 'none',
    direction: 'inline',
    size: 'normal',
});
map(NumberType, NumberTypeView, {
    kind: 'type',
    direction: 'inline',
    size: 'small',
});
map(Unit, UnitView, { kind: 'none', direction: 'inline', size: 'small' });
map(Dimension, DimensionView, {
    kind: 'none',
    direction: 'inline',
    size: 'normal',
});

map(BooleanLiteral, BooleanLiteralView, {
    kind: 'none',
    direction: 'inline',
    size: 'normal',
});
map(BooleanType, BooleanTypeView, {
    kind: 'type',
    direction: 'inline',
    size: 'small',
});

map(NoneLiteral, NoneLiteralView, {
    kind: 'none',
    direction: 'inline',
    size: 'normal',
});
map(NoneType, NoneTypeView, {
    kind: 'type',
    direction: 'inline',
    size: 'small',
});

map(SetLiteral, SetLiteralView, {
    kind: 'data',
    direction: 'inline',
    size: 'normal',
});
map(MapLiteral, MapLiteralView, {
    kind: 'data',
    direction: 'inline',
    size: 'normal',
});
map(KeyValue, KeyValueView, {
    kind: 'plain',
    direction: 'inline',
    size: 'normal',
});
map(SetOrMapAccess, SetOrMapAccessView, {
    kind: 'plain',
    direction: 'inline',
    size: 'normal',
});
map(SetType, SetTypeView, {
    kind: 'type',
    direction: 'inline',
    size: 'small',
});
map(MapType, MapTypeView, {
    kind: 'type',
    direction: 'inline',
    size: 'small',
});
map(ListLiteral, ListLiteralView, {
    kind: 'data',
    direction: 'inline',
    size: 'normal',
});
map(Spread, SpreadView, {
    kind: 'plain',
    direction: 'inline',
    size: 'normal',
});
map(ListAccess, ListAccessView, {
    kind: 'plain',
    direction: 'inline',
    size: 'normal',
});
map(ListType, ListTypeView, {
    kind: 'type',
    direction: 'inline',
    size: 'small',
});
map(FormattedType, FormattedTypeView, {
    kind: 'type',
    direction: 'inline',
    size: 'small',
});

map(TableLiteral, TableLiteralView, {
    kind: 'data',
    direction: 'inline',
    size: 'normal',
});
map(TableType, TableTypeView, {
    kind: 'type',
    direction: 'inline',
    size: 'small',
});
map(Row, RowView, {
    kind: 'data',
    direction: 'inline',
    size: 'normal',
});
map(Insert, InsertView, {
    kind: 'plain',
    direction: 'inline',
    size: 'normal',
});
map(Delete, DeleteView, {
    kind: 'plain',
    direction: 'inline',
    size: 'normal',
});
map(Update, UpdateView, {
    kind: 'plain',
    direction: 'inline',
    size: 'normal',
});
map(Select, SelectView, {
    kind: 'plain',
    direction: 'inline',
    size: 'normal',
});

map(Reaction, ReactionView, {
    kind: 'evaluate',
    direction: 'inline',
    size: 'normal',
});
map(Previous, PreviousView, {
    kind: 'plain',
    direction: 'inline',
    size: 'normal',
});
map(Changed, ChangedView, {
    kind: 'predicate',
    direction: 'inline',
    size: 'normal',
});
map(Initial, InitialView, {
    kind: 'plain',
    direction: 'inline',
    size: 'normal',
});
map(StreamType, StreamTypeView, {
    kind: 'type',
    direction: 'inline',
    size: 'small',
});
map(UnparsableType, UnparsableTypeView, {
    kind: 'plain',
    direction: 'inline',
    size: 'normal',
});
map(UnparsableExpression, UnparsableExpressionView, {
    kind: 'plain',
    direction: 'inline',
    size: 'normal',
});

map(UnionType, UnionTypeView, {
    kind: 'type',
    direction: 'inline',
    size: 'small',
});
map(TypePlaceholder, TypePlaceholderView, {
    kind: 'type',
    direction: 'inline',
    size: 'small',
});
map(Is, IsView, {
    kind: 'predicate',
    direction: 'inline',
    size: 'normal',
});
map(IsLocale, IsLocaleView, {
    kind: 'predicate',
    direction: 'inline',
    size: 'normal',
});
map(This, ThisView, {
    kind: 'plain',
    direction: 'inline',
    size: 'normal',
});
map(Type, TypeView, {
    kind: 'type',
    direction: 'inline',
    size: 'small',
});

map(StructureType, StructureTypeView, {
    kind: 'type',
    direction: 'inline',
    size: 'small',
});

export default function getNodeView(node: Node): BlockConfig {
    // Climb the class hierarchy until finding a satisfactory view of the node.
    let constructor = node.constructor;
    do {
        const view = nodeToView.get(constructor);
        if (view !== undefined) return view;
        constructor = Object.getPrototypeOf(constructor);
    } while (constructor);
    return {
        component: UnknownNodeView,
        style: { kind: 'plain', direction: 'inline', size: 'normal' },
    };
}
