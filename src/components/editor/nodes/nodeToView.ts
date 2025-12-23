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
import WebLinkView from './WebLinkView.svelte';
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

// Block styling for each view
type BlockKind =
    | 'plain'
    | 'definition'
    | 'data'
    | 'evaluate'
    | 'type'
    | 'predicate'
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
map(Doc, DocView, { kind: 'plain', direction: 'inline', size: 'normal' });
map(Docs, DocsView, { kind: 'none', direction: 'inline', size: 'normal' });
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
    direction: 'inline',
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
    kind: 'none',
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
    kind: 'plain',
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
    kind: 'none',
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
    kind: 'none',
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
    kind: 'plain',
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
    kind: 'plain',
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
    kind: 'plain',
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
map(Unit, UnitView, { kind: 'type', direction: 'inline', size: 'small' });
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
