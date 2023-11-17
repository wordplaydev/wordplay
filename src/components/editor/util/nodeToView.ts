import type { ComponentType, SvelteComponent } from 'svelte';

/* eslint-disable @typescript-eslint/ban-types */
import BlockView from '../BlockView.svelte';
import BorrowView from '../BorrowView.svelte';
import BindView from '../BindView.svelte';
import NameView from '../NameView.svelte';
import NamesView from '../NamesView.svelte';
import LanguageView from '../LanguageView.svelte';
import StructureDefinitionView from '../StructureDefinitionView.svelte';
import ListLiteralView from '../ListLiteralView.svelte';
import TextLiteralView from '../TextLiteralView.svelte';
import ListTypeView from '../ListTypeView.svelte';
import TextTypeView from '../TextTypeView.svelte';
import NameTypeView from '../NameTypeView.svelte';
import ConditionalView from '../ConditionalView.svelte';
import TypeVariableView from '../TypeVariableView.svelte';
import TypeVariablesView from '../TypeVariablesView.svelte';
import EvaluateView from '../EvaluateView.svelte';
import ReferenceView from '../ReferenceView.svelte';
import BinaryEvaluateView from '../BinaryEvaluateView.svelte';
import NumberLiteralView from '../NumberLiteralView.svelte';
import UnitView from '../UnitView.svelte';
import ConvertView from '../ConvertView.svelte';
import PropertyReferenceView from '../PropertyReferenceView.svelte';
import FunctionDefinitionView from '../FunctionDefinitionView.svelte';
import ReactionView from '../ReactionView.svelte';
import UnaryEvaluateView from '../UnaryEvaluateView.svelte';
import BooleanLiteralView from '../BooleanLiteralView.svelte';
import BooleanTypeView from '../BooleanTypeView.svelte';
import ExpressionPlaceholderView from '../ExpressionPlaceholderView.svelte';
import TypePlaceholderView from '../TypePlaceholderView.svelte';
import NoneLiteralView from '../NoneLiteralView.svelte';
import NoneTypeView from '../NoneTypeView.svelte';
import NumberTypeView from '../NumberTypeView.svelte';
import SetLiteralView from '../SetLiteralView.svelte';
import MapLiteralView from '../MapLiteralView.svelte';
import KeyValueView from '../KeyValueView.svelte';
import SetOrMapAccessView from '../SetOrMapAccessView.svelte';
import SetTypeView from '../SetTypeView.svelte';
import MapTypeView from '../MapTypeView.svelte';
import ListAccessView from '../ListAccessView.svelte';
import ConversionDefinitionView from '../ConversionDefinitionView.svelte';
import PreviousView from '../PreviousView.svelte';
import StreamTypeView from '../StreamTypeView.svelte';
import IsView from '../IsView.svelte';
import UnionTypeView from '../UnionTypeView.svelte';
import DocView from '../DocView.svelte';
import DocsView from '../DocsView.svelte';
import TableTypeView from '../TableTypeView.svelte';
import TableLiteralView from '../TableLiteralView.svelte';
import RowView from '../RowView.svelte';
import FunctionTypeView from '../FunctionTypeView.svelte';
import ThisView from '../ThisView.svelte';
import UnknownNodeView from '../UnknownNodeView.svelte';
import InsertView from '../InsertView.svelte';
import DeleteView from '../DeleteView.svelte';
import UpdateView from '../UpdateView.svelte';
import SelectView from '../SelectView.svelte';
import TokenView from '../TokenView.svelte';
import ProgramView from '../ProgramView.svelte';
import UnparsableTypeView from '../UnparsableTypeView.svelte';
import DimensionView from '../DimensionView.svelte';
import UnparsableExpressionView from '../UnparsableExpressionView.svelte';
import TypeView from '../TypeView.svelte';
import DocumentedExpressionView from '../DocumentedExpressionView.svelte';
import TypeInputsView from '../TypeInputsView.svelte';
import ChangedView from '../ChangedView.svelte';
import StructureTypeView from '../StructureTypeView.svelte';
import ParagraphView from '../ParagraphView.svelte';
import LinkView from '../WebLinkView.svelte';
import ConceptLinkView from '../ConceptLinkView.svelte';
import WordsView from '../WordsView.svelte';
import ExampleView from '../ExampleView.svelte';
import PropertyBindView from '../PropertyBindView.svelte';
import InitialView from '../InitialView.svelte';
import MarkupView from '../MarkupView.svelte';
import SourceView from '../SourceView.svelte';
import ConversionTypeView from '../ConversionTypeView.svelte';
import FormattedTypeView from '../FormattedTypeView.svelte';
import TranslationView from '../TranslationView.svelte';
import FormattedLiteralView from '../FormattedLiteralView.svelte';
import FormattedTranslationView from '../FormattedTranslationView.svelte';
import IsLocaleView from '../IsLocaleView.svelte';
import SpreadView from '../SpreadView.svelte';

import type Node from '@nodes/Node';
import Program from '@nodes/Program';
import Token from '@nodes/Token';
import Doc from '@nodes/Doc';
import Borrow from '@nodes/Borrow';
import Block from '@nodes/Block';
import Bind from '@nodes/Bind';
import Name from '@nodes/Name';
import Language from '@nodes/Language';
import Reference from '@nodes/Reference';
import StructureDefinition from '@nodes/StructureDefinition';
import PropertyReference from '@nodes/PropertyReference';
import NameType from '@nodes/NameType';
import TypeVariables from '@nodes/TypeVariables';
import TypeInputs from '@nodes/TypeInputs';
import TextLiteral from '@nodes/TextLiteral';
import TextType from '@nodes/TextType';
import FunctionDefinition from '@nodes/FunctionDefinition';
import FunctionType from '@nodes/FunctionType';
import Evaluate from '@nodes/Evaluate';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import BinaryEvaluate from '@nodes/BinaryEvaluate';
import UnaryEvaluate from '@nodes/UnaryEvaluate';
import Convert from '@nodes/Convert';
import ConversionDefinition from '@nodes/ConversionDefinition';
import ConversionType from '@nodes/ConversionType';
import Conditional from '@nodes/Conditional';
import NumberLiteral from '@nodes/NumberLiteral';
import NumberType from '@nodes/NumberType';
import Unit from '@nodes/Unit';
import BooleanLiteral from '@nodes/BooleanLiteral';
import BooleanType from '@nodes/BooleanType';
import NoneLiteral from '@nodes/NoneLiteral';
import NoneType from '@nodes/NoneType';
import SetLiteral from '@nodes/SetLiteral';
import MapLiteral from '@nodes/MapLiteral';
import KeyValue from '@nodes/KeyValue';
import SetOrMapAccess from '@nodes/SetOrMapAccess';
import SetType from '@nodes/SetType';
import MapType from '@nodes/MapType';
import ListLiteral from '@nodes/ListLiteral';
import ListAccess from '@nodes/ListAccess';
import ListType from '@nodes/ListType';
import TableLiteral from '@nodes/TableLiteral';
import TableType from '@nodes/TableType';
import Row from '@nodes/Row';
import Insert from '@nodes/Insert';
import Delete from '@nodes/Delete';
import Update from '@nodes/Update';
import Select from '@nodes/Select';
import Reaction from '@nodes/Reaction';
import Previous from '@nodes/Previous';
import Changed from '@nodes/Changed';
import StreamType from '@nodes/StreamType';
import UnionType from '@nodes/UnionType';
import TypePlaceholder from '@nodes/TypePlaceholder';
import Is from '@nodes/Is';
import This from '@nodes/This';
import Dimension from '@nodes/Dimension';
import Names from '@nodes/Names';
import Docs from '@nodes/Docs';
import UnparsableType from '@nodes/UnparsableType';
import UnparsableExpression from '@nodes/UnparsableExpression';
import DocumentedExpression from '@nodes/DocumentedExpression';
import TypeVariable from '@nodes/TypeVariable';
import StructureType from '@nodes/StructureType';
import Paragraph from '@nodes/Paragraph';
import WebLink from '@nodes/WebLink';
import ConceptLink from '@nodes/ConceptLink';
import Words from '@nodes/Words';
import Example from '@nodes/Example';
import PropertyBind from '@nodes/PropertyBind';
import Initial from '@nodes/Initial';
import Markup from '@nodes/Markup';
import VariableType from '@nodes/VariableType';
import VariableTypeView from '../VariableTypeView.svelte';
import Source from '@nodes/Source';
import Type from '@nodes/Type';
import FormattedType from '@nodes/FormattedType';
import Translation from '@nodes/Translation';
import FormattedTranslation from '@nodes/FormattedTranslation';
import FormattedLiteral from '@nodes/FormattedLiteral';
import IsLocale from '@nodes/IsLocale';
import Spread from '@nodes/Spread';
import NoneOrView from '../OtherwiseView.svelte';
import Otherwise from '@nodes/Otherwise';

const nodeToView = new Map<Function, ComponentType<SvelteComponent>>();

nodeToView.set(Source, SourceView);
nodeToView.set(Program, ProgramView);
nodeToView.set(Token, TokenView);
nodeToView.set(Doc, DocView);
nodeToView.set(Docs, DocsView);
nodeToView.set(Paragraph, ParagraphView);
nodeToView.set(WebLink, LinkView);
nodeToView.set(ConceptLink, ConceptLinkView);
nodeToView.set(Words, WordsView);
nodeToView.set(DocumentedExpression, DocumentedExpressionView);
nodeToView.set(Example, ExampleView);
nodeToView.set(Markup, MarkupView);
nodeToView.set(FormattedLiteral, FormattedLiteralView);
nodeToView.set(FormattedTranslation, FormattedTranslationView);

nodeToView.set(Borrow, BorrowView);

nodeToView.set(Block, BlockView);

nodeToView.set(Bind, BindView);
nodeToView.set(Name, NameView);
nodeToView.set(Names, NamesView);
nodeToView.set(Language, LanguageView);
nodeToView.set(Reference, ReferenceView);

nodeToView.set(StructureDefinition, StructureDefinitionView);
nodeToView.set(PropertyReference, PropertyReferenceView);
nodeToView.set(PropertyBind, PropertyBindView);
nodeToView.set(NameType, NameTypeView);

nodeToView.set(TypeVariables, TypeVariablesView);
nodeToView.set(TypeVariable, TypeVariableView);
nodeToView.set(TypeInputs, TypeInputsView);
nodeToView.set(VariableType, VariableTypeView);

nodeToView.set(TextLiteral, TextLiteralView);
nodeToView.set(Translation, TranslationView);
nodeToView.set(TextType, TextTypeView);

nodeToView.set(FunctionDefinition, FunctionDefinitionView);
nodeToView.set(FunctionType, FunctionTypeView);
nodeToView.set(Evaluate, EvaluateView);

nodeToView.set(ExpressionPlaceholder, ExpressionPlaceholderView);
nodeToView.set(BinaryEvaluate, BinaryEvaluateView);
nodeToView.set(UnaryEvaluate, UnaryEvaluateView);

nodeToView.set(Convert, ConvertView);
nodeToView.set(ConversionDefinition, ConversionDefinitionView);
nodeToView.set(ConversionType, ConversionTypeView);

nodeToView.set(Otherwise, NoneOrView);
nodeToView.set(Conditional, ConditionalView);

nodeToView.set(NumberLiteral, NumberLiteralView);
nodeToView.set(NumberType, NumberTypeView);
nodeToView.set(Unit, UnitView);
nodeToView.set(Dimension, DimensionView);

nodeToView.set(BooleanLiteral, BooleanLiteralView);
nodeToView.set(BooleanType, BooleanTypeView);

nodeToView.set(NoneLiteral, NoneLiteralView);
nodeToView.set(NoneType, NoneTypeView);

nodeToView.set(SetLiteral, SetLiteralView);
nodeToView.set(MapLiteral, MapLiteralView);
nodeToView.set(KeyValue, KeyValueView);
nodeToView.set(SetOrMapAccess, SetOrMapAccessView);
nodeToView.set(SetType, SetTypeView);
nodeToView.set(MapType, MapTypeView);

nodeToView.set(ListLiteral, ListLiteralView);
nodeToView.set(Spread, SpreadView);
nodeToView.set(ListAccess, ListAccessView);
nodeToView.set(ListType, ListTypeView);

nodeToView.set(FormattedType, FormattedTypeView);

nodeToView.set(TableLiteral, TableLiteralView);
nodeToView.set(TableType, TableTypeView);
nodeToView.set(Row, RowView);
nodeToView.set(Insert, InsertView);
nodeToView.set(Delete, DeleteView);
nodeToView.set(Update, UpdateView);
nodeToView.set(Select, SelectView);

nodeToView.set(Reaction, ReactionView);
nodeToView.set(Previous, PreviousView);
nodeToView.set(Changed, ChangedView);
nodeToView.set(Initial, InitialView);
nodeToView.set(StreamType, StreamTypeView);
nodeToView.set(UnparsableType, UnparsableTypeView);
nodeToView.set(UnparsableExpression, UnparsableExpressionView);

nodeToView.set(UnionType, UnionTypeView);
nodeToView.set(TypePlaceholder, TypePlaceholderView);
nodeToView.set(Is, IsView);
nodeToView.set(IsLocale, IsLocaleView);

nodeToView.set(This, ThisView);

nodeToView.set(Type, TypeView);

nodeToView.set(StructureType, StructureTypeView);

export default function getNodeView(node: Node) {
    // Climp the class hierarchy until finding a satisfactory view of the node.
    let constructor = node.constructor;
    do {
        const view = nodeToView.get(constructor);
        if (view !== undefined) return view;
        constructor = Object.getPrototypeOf(constructor);
    } while (constructor);
    return UnknownNodeView;
}
