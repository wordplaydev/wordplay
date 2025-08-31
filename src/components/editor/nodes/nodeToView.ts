import type { Component } from 'svelte';

/* eslint-disable @typescript-eslint/ban-types */
import TokenView from '../tokens/TokenView.svelte';
import BinaryEvaluateView from './BinaryEvaluateView.svelte';
import BindView from './BindView.svelte';
import BlockView from './BlockView.svelte';
import BooleanLiteralView from './BooleanLiteralView.svelte';
import BooleanTypeView from './BooleanTypeView.svelte';
import BorrowView from './BorrowView.svelte';
import ChangedView from './ChangedView.svelte';
import ConceptLinkView from './ConceptLinkView.svelte';
import ConditionalView from './ConditionalView.svelte';
import ConversionDefinitionView from './ConversionDefinitionView.svelte';
import ConversionTypeView from './ConversionTypeView.svelte';
import ConvertView from './ConvertView.svelte';
import DeleteView from './DeleteView.svelte';
import DimensionView from './DimensionView.svelte';
import DocView from './DocView.svelte';
import DocsView from './DocsView.svelte';
import DocumentedExpressionView from './DocumentedExpressionView.svelte';
import EvaluateView from './EvaluateView.svelte';
import ExampleView from './ExampleView.svelte';
import ExpressionPlaceholderView from './ExpressionPlaceholderView.svelte';
import FormattedLiteralView from './FormattedLiteralView.svelte';
import FormattedTranslationView from './FormattedTranslationView.svelte';
import FormattedTypeView from './FormattedTypeView.svelte';
import FunctionDefinitionView from './FunctionDefinitionView.svelte';
import FunctionTypeView from './FunctionTypeView.svelte';
import InitialView from './InitialView.svelte';
import InputView from './InputView.svelte';
import InsertView from './InsertView.svelte';
import IsLocaleView from './IsLocaleView.svelte';
import IsView from './IsView.svelte';
import KeyValueView from './KeyValueView.svelte';
import LanguageView from './LanguageView.svelte';
import ListAccessView from './ListAccessView.svelte';
import ListLiteralView from './ListLiteralView.svelte';
import ListTypeView from './ListTypeView.svelte';
import MapLiteralView from './MapLiteralView.svelte';
import MapTypeView from './MapTypeView.svelte';
import MarkupView from './MarkupView.svelte';
import MatchView from './MatchView.svelte';
import NameTypeView from './NameTypeView.svelte';
import NameView from './NameView.svelte';
import NamesView from './NamesView.svelte';
import NoneLiteralView from './NoneLiteralView.svelte';
import NoneTypeView from './NoneTypeView.svelte';
import NumberLiteralView from './NumberLiteralView.svelte';
import NumberTypeView from './NumberTypeView.svelte';
import ParagraphView from './ParagraphView.svelte';
import PreviousView from './PreviousView.svelte';
import ProgramView from './ProgramView.svelte';
import PropertyBindView from './PropertyBindView.svelte';
import PropertyReferenceView from './PropertyReferenceView.svelte';
import ReactionView from './ReactionView.svelte';
import ReferenceView from './ReferenceView.svelte';
import RowView from './RowView.svelte';
import SelectView from './SelectView.svelte';
import SetLiteralView from './SetLiteralView.svelte';
import SetOrMapAccessView from './SetOrMapAccessView.svelte';
import SetTypeView from './SetTypeView.svelte';
import SourceView from './SourceView.svelte';
import SpreadView from './SpreadView.svelte';
import StreamTypeView from './StreamTypeView.svelte';
import StructureDefinitionView from './StructureDefinitionView.svelte';
import StructureTypeView from './StructureTypeView.svelte';
import TableLiteralView from './TableLiteralView.svelte';
import TableTypeView from './TableTypeView.svelte';
import TextLiteralView from './TextLiteralView.svelte';
import TextTypeView from './TextTypeView.svelte';
import ThisView from './ThisView.svelte';
import TranslationView from './TranslationView.svelte';
import TypeInputsView from './TypeInputsView.svelte';
import TypePlaceholderView from './TypePlaceholderView.svelte';
import TypeVariableView from './TypeVariableView.svelte';
import TypeVariablesView from './TypeVariablesView.svelte';
import TypeView from './TypeView.svelte';
import UnaryEvaluateView from './UnaryEvaluateView.svelte';
import UnionTypeView from './UnionTypeView.svelte';
import UnitView from './UnitView.svelte';
import UnknownNodeView from './UnknownNodeView.svelte';
import UnparsableExpressionView from './UnparsableExpressionView.svelte';
import UnparsableTypeView from './UnparsableTypeView.svelte';
import UpdateView from './UpdateView.svelte';
import LinkView from './WebLinkView.svelte';
import WordsView from './WordsView.svelte';

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
import type { Format } from './NodeView.svelte';
import NoneOrView from './OtherwiseView.svelte';
import VariableTypeView from './VariableTypeView.svelte';

type NodeViewComponent = Component<{
    node: any;
    format: Format;
}>;

const nodeToView = new Map<Function & { prototype: Node }, NodeViewComponent>();

function map<Kind extends Node>(
    node: Function & { prototype: Kind },
    view: NodeViewComponent,
) {
    nodeToView.set(node, view);
}

map(Token, TokenView);
map(Source, SourceView);
map(Program, ProgramView);
map(Doc, DocView);
map(Docs, DocsView);
map(Paragraph, ParagraphView);
map(WebLink, LinkView);
map(ConceptLink, ConceptLinkView);
map(Words, WordsView);
map(DocumentedExpression, DocumentedExpressionView);
map(Example, ExampleView);
map(Markup, MarkupView);
map(FormattedLiteral, FormattedLiteralView);
map(FormattedTranslation, FormattedTranslationView);

map(Borrow, BorrowView);

map(Block, BlockView);

map(Bind, BindView);
map(Name, NameView);
map(Names, NamesView);
map(Language, LanguageView);
map(Reference, ReferenceView);

map(StructureDefinition, StructureDefinitionView);
map(PropertyReference, PropertyReferenceView);
map(PropertyBind, PropertyBindView);
map(NameType, NameTypeView);

map(TypeVariables, TypeVariablesView);
map(TypeVariable, TypeVariableView);
map(TypeInputs, TypeInputsView);
map(VariableType, VariableTypeView);

map(TextLiteral, TextLiteralView);
map(Translation, TranslationView);
map(TextType, TextTypeView);

map(FunctionDefinition, FunctionDefinitionView);
map(FunctionType, FunctionTypeView);
map(Evaluate, EvaluateView);
map(Input, InputView);

map(ExpressionPlaceholder, ExpressionPlaceholderView);
map(BinaryEvaluate, BinaryEvaluateView);
map(UnaryEvaluate, UnaryEvaluateView);

map(Convert, ConvertView);
map(ConversionDefinition, ConversionDefinitionView);
map(ConversionType, ConversionTypeView);

map(Conditional, ConditionalView);
map(Otherwise, NoneOrView);
map(Match, MatchView);

map(NumberLiteral, NumberLiteralView);
map(NumberType, NumberTypeView);
map(Unit, UnitView);
map(Dimension, DimensionView);

map(BooleanLiteral, BooleanLiteralView);
map(BooleanType, BooleanTypeView);

map(NoneLiteral, NoneLiteralView);
map(NoneType, NoneTypeView);

map(SetLiteral, SetLiteralView);
map(MapLiteral, MapLiteralView);
map(KeyValue, KeyValueView);
map(SetOrMapAccess, SetOrMapAccessView);
map(SetType, SetTypeView);
map(MapType, MapTypeView);

map(ListLiteral, ListLiteralView);
map(Spread, SpreadView);
map(ListAccess, ListAccessView);
map(ListType, ListTypeView);

map(FormattedType, FormattedTypeView);

map(TableLiteral, TableLiteralView);
map(TableType, TableTypeView);
map(Row, RowView);
map(Insert, InsertView);
map(Delete, DeleteView);
map(Update, UpdateView);
map(Select, SelectView);

map(Reaction, ReactionView);
map(Previous, PreviousView);
map(Changed, ChangedView);
map(Initial, InitialView);
map(StreamType, StreamTypeView);
map(UnparsableType, UnparsableTypeView);
map(UnparsableExpression, UnparsableExpressionView);

map(UnionType, UnionTypeView);
map(TypePlaceholder, TypePlaceholderView);
map(Is, IsView);
map(IsLocale, IsLocaleView);

map(This, ThisView);

map(Type, TypeView);

map(StructureType, StructureTypeView);

export default function getNodeView(node: Node): NodeViewComponent {
    // Climb the class hierarchy until finding a satisfactory view of the node.
    let constructor = node.constructor;
    do {
        const view = nodeToView.get(constructor);
        if (view !== undefined) return view;
        constructor = Object.getPrototypeOf(constructor);
    } while (constructor);
    return UnknownNodeView;
}
