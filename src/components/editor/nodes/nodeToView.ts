import type { Component } from 'svelte';

/* eslint-disable @typescript-eslint/ban-types */
import TokenView from '#components/editor/tokens/TokenView.svelte';
import BinaryEvaluateView from '#components/editor/nodes/BinaryEvaluateView.svelte';
import BindView from '#components/editor/nodes/BindView.svelte';
import BlockView from '#components/editor/nodes/BlockView.svelte';
import BooleanLiteralView from '#components/editor/nodes/BooleanLiteralView.svelte';
import BooleanTypeView from '#components/editor/nodes/BooleanTypeView.svelte';
import BorrowView from '#components/editor/nodes/BorrowView.svelte';
import ChangedView from '#components/editor/nodes/ChangedView.svelte';
import BranchView from '#components/editor/nodes/BranchView.svelte';
import ConceptLinkView from '#components/editor/nodes/ConceptLinkView.svelte';
import ExternalExampleView from '#components/editor/nodes/ExternalExampleView.svelte';
import MentionView from '#components/editor/nodes/MentionView.svelte';
import ConditionalView from '#components/editor/nodes/ConditionalView.svelte';
import ConversionDefinitionView from '#components/editor/nodes/ConversionDefinitionView.svelte';
import ConversionTypeView from '#components/editor/nodes/ConversionTypeView.svelte';
import ConvertView from '#components/editor/nodes/ConvertView.svelte';
import TranslateView from '#components/editor/nodes/TranslateView.svelte';
import DeleteView from '#components/editor/nodes/DeleteView.svelte';
import DimensionView from '#components/editor/nodes/DimensionView.svelte';
import DocView from '#components/editor/nodes/DocView.svelte';
import DocsView from '#components/editor/nodes/DocsView.svelte';
import DocumentedExpressionView from '#components/editor/nodes/DocumentedExpressionView.svelte';
import EvaluateView from '#components/editor/nodes/EvaluateView.svelte';
import ExampleView from '#components/editor/nodes/ExampleView.svelte';
import ExpressionPlaceholderView from '#components/editor/nodes/ExpressionPlaceholderView.svelte';
import FormattedLiteralView from '#components/editor/nodes/FormattedLiteralView.svelte';
import FormattedTranslationView from '#components/editor/nodes/FormattedTranslationView.svelte';
import FormattedTypeView from '#components/editor/nodes/FormattedTypeView.svelte';
import FunctionDefinitionView from '#components/editor/nodes/FunctionDefinitionView.svelte';
import FunctionTypeView from '#components/editor/nodes/FunctionTypeView.svelte';
import InitialView from '#components/editor/nodes/InitialView.svelte';
import InputView from '#components/editor/nodes/InputView.svelte';
import InsertView from '#components/editor/nodes/InsertView.svelte';
import IsLocaleView from '#components/editor/nodes/IsLocaleView.svelte';
import LocalizedView from '#components/editor/nodes/LocalizedView.svelte';
import IsView from '#components/editor/nodes/IsView.svelte';
import KeyValueView from '#components/editor/nodes/KeyValueView.svelte';
import LanguageView from '#components/editor/nodes/LanguageView.svelte';
import ListAccessView from '#components/editor/nodes/ListAccessView.svelte';
import ListLiteralView from '#components/editor/nodes/ListLiteralView.svelte';
import PatternLiteralView from '#components/editor/nodes/PatternLiteralView.svelte';
import PatternTypeView from '#components/editor/nodes/PatternTypeView.svelte';
import PatternSequenceView from '#components/editor/nodes/PatternSequenceView.svelte';
import PatternGroupView from '#components/editor/nodes/PatternGroupView.svelte';
import PatternSetView from '#components/editor/nodes/PatternSetView.svelte';
import PatternLookView from '#components/editor/nodes/PatternLookView.svelte';
import PatternCaseFoldView from '#components/editor/nodes/PatternCaseFoldView.svelte';
import PatternQuantifiedView from '#components/editor/nodes/PatternQuantifiedView.svelte';
import PatternQuantifierView from '#components/editor/nodes/PatternQuantifierView.svelte';
import PatternCaptureView from '#components/editor/nodes/PatternCaptureView.svelte';
import PatternComplementView from '#components/editor/nodes/PatternComplementView.svelte';
import PatternClassView from '#components/editor/nodes/PatternClassView.svelte';
import PatternPropertyView from '#components/editor/nodes/PatternPropertyView.svelte';
import PatternWordView from '#components/editor/nodes/PatternWordView.svelte';
import PatternWordEdgeView from '#components/editor/nodes/PatternWordEdgeView.svelte';
import PatternLiteralTextView from '#components/editor/nodes/PatternLiteralTextView.svelte';
import PatternAnchorView from '#components/editor/nodes/PatternAnchorView.svelte';
import PatternBackrefView from '#components/editor/nodes/PatternBackrefView.svelte';
import PatternRestView from '#components/editor/nodes/PatternRestView.svelte';
import PatternRangeView from '#components/editor/nodes/PatternRangeView.svelte';
import ListTypeView from '#components/editor/nodes/ListTypeView.svelte';
import MapLiteralView from '#components/editor/nodes/MapLiteralView.svelte';
import MapTypeView from '#components/editor/nodes/MapTypeView.svelte';
import MarkupView from '#components/editor/nodes/MarkupView.svelte';
import MatchView from '#components/editor/nodes/MatchView.svelte';
import NameTypeView from '#components/editor/nodes/NameTypeView.svelte';
import NameView from '#components/editor/nodes/NameView.svelte';
import NamesView from '#components/editor/nodes/NamesView.svelte';
import NoneLiteralView from '#components/editor/nodes/NoneLiteralView.svelte';
import NoneTypeView from '#components/editor/nodes/NoneTypeView.svelte';
import NumberLiteralView from '#components/editor/nodes/NumberLiteralView.svelte';
import NumberTypeView from '#components/editor/nodes/NumberTypeView.svelte';
import ParagraphView from '#components/editor/nodes/ParagraphView.svelte';
import PreviousView from '#components/editor/nodes/PreviousView.svelte';
import ProgramView from '#components/editor/nodes/ProgramView.svelte';
import PropertyBindView from '#components/editor/nodes/PropertyBindView.svelte';
import PropertyReferenceView from '#components/editor/nodes/PropertyReferenceView.svelte';
import ReactionView from '#components/editor/nodes/ReactionView.svelte';
import ReferenceView from '#components/editor/nodes/ReferenceView.svelte';
import RowView from '#components/editor/nodes/RowView.svelte';
import SelectView from '#components/editor/nodes/SelectView.svelte';
import SetLiteralView from '#components/editor/nodes/SetLiteralView.svelte';
import SetOrMapAccessView from '#components/editor/nodes/SetOrMapAccessView.svelte';
import SetTypeView from '#components/editor/nodes/SetTypeView.svelte';
import SourceView from '#components/editor/nodes/SourceView.svelte';
import SpreadView from '#components/editor/nodes/SpreadView.svelte';
import StreamTypeView from '#components/editor/nodes/StreamTypeView.svelte';
import StructureDefinitionView from '#components/editor/nodes/StructureDefinitionView.svelte';
import StructureTypeView from '#components/editor/nodes/StructureTypeView.svelte';
import TableLiteralView from '#components/editor/nodes/TableLiteralView.svelte';
import TableTypeView from '#components/editor/nodes/TableTypeView.svelte';
import TextLiteralView from '#components/editor/nodes/TextLiteralView.svelte';
import TextTypeView from '#components/editor/nodes/TextTypeView.svelte';
import ThisView from '#components/editor/nodes/ThisView.svelte';
import TranslationView from '#components/editor/nodes/TranslationView.svelte';
import TypeInputsView from '#components/editor/nodes/TypeInputsView.svelte';
import TypePlaceholderView from '#components/editor/nodes/TypePlaceholderView.svelte';
import TypeVariableView from '#components/editor/nodes/TypeVariableView.svelte';
import TypeVariablesView from '#components/editor/nodes/TypeVariablesView.svelte';
import TypeView from '#components/editor/nodes/TypeView.svelte';
import UnaryEvaluateView from '#components/editor/nodes/UnaryEvaluateView.svelte';
import UnionTypeView from '#components/editor/nodes/UnionTypeView.svelte';
import UnitView from '#components/editor/nodes/UnitView.svelte';
import UnknownNodeView from '#components/editor/nodes/UnknownNodeView.svelte';
import UnparsableExpressionView from '#components/editor/nodes/UnparsableExpressionView.svelte';
import UnparsableTypeView from '#components/editor/nodes/UnparsableTypeView.svelte';
import UpdateView from '#components/editor/nodes/UpdateView.svelte';
import WebLinkView from '#components/editor/nodes/WebLinkView.svelte';
import WordsView from '#components/editor/nodes/WordsView.svelte';

import BinaryEvaluate from '#nodes/BinaryEvaluate.ts';
import Bind from '#nodes/Bind.ts';
import Block from '#nodes/Block.ts';
import BooleanLiteral from '#nodes/BooleanLiteral.ts';
import BooleanType from '#nodes/BooleanType.ts';
import Borrow from '#nodes/Borrow.ts';
import Changed from '#nodes/Changed.ts';
import ConceptLink from '#nodes/ConceptLink.ts';
import Conditional from '#nodes/Conditional.ts';
import ConversionDefinition from '#nodes/ConversionDefinition.ts';
import ConversionType from '#nodes/ConversionType.ts';
import Convert from '#nodes/Convert.ts';
import Translate from '#nodes/Translate.ts';
import Delete from '#nodes/Delete.ts';
import Dimension from '#nodes/Dimension.ts';
import Doc from '#nodes/Doc.ts';
import Docs from '#nodes/Docs.ts';
import DocumentedExpression from '#nodes/DocumentedExpression.ts';
import Evaluate from '#nodes/Evaluate.ts';
import Branch from '#nodes/Branch.ts';
import Example from '#nodes/Example.ts';
import ExternalExample from '#nodes/ExternalExample.ts';
import ExpressionPlaceholder from '#nodes/ExpressionPlaceholder.ts';
import FormattedLiteral from '#nodes/FormattedLiteral.ts';
import FormattedTranslation from '#nodes/FormattedTranslation.ts';
import FormattedType from '#nodes/FormattedType.ts';
import FunctionDefinition from '#nodes/FunctionDefinition.ts';
import FunctionType from '#nodes/FunctionType.ts';
import Initial from '#nodes/Initial.ts';
import Input from '#nodes/Input.ts';
import Insert from '#nodes/Insert.ts';
import Is from '#nodes/Is.ts';
import IsLocale from '#nodes/IsLocale.ts';
import Localized from '#nodes/Localized.ts';
import KeyValue from '#nodes/KeyValue.ts';
import Language from '#nodes/Language.ts';
import ListAccess from '#nodes/ListAccess.ts';
import ListLiteral from '#nodes/ListLiteral.ts';
import PatternLiteral from '#nodes/PatternLiteral.ts';
import PatternType from '#nodes/PatternType.ts';
import PatternSequence from '#nodes/PatternSequence.ts';
import PatternGroup from '#nodes/PatternGroup.ts';
import PatternSet from '#nodes/PatternSet.ts';
import PatternLook from '#nodes/PatternLook.ts';
import PatternCaseFold from '#nodes/PatternCaseFold.ts';
import PatternQuantified from '#nodes/PatternQuantified.ts';
import PatternQuantifier from '#nodes/PatternQuantifier.ts';
import PatternCapture from '#nodes/PatternCapture.ts';
import PatternComplement from '#nodes/PatternComplement.ts';
import PatternClass from '#nodes/PatternClass.ts';
import PatternProperty from '#nodes/PatternProperty.ts';
import PatternWord from '#nodes/PatternWord.ts';
import PatternWordEdge from '#nodes/PatternWordEdge.ts';
import PatternLiteralText from '#nodes/PatternLiteralText.ts';
import PatternAnchor from '#nodes/PatternAnchor.ts';
import PatternBackref from '#nodes/PatternBackref.ts';
import PatternRest from '#nodes/PatternRest.ts';
import PatternRange from '#nodes/PatternRange.ts';
import ListType from '#nodes/ListType.ts';
import MapLiteral from '#nodes/MapLiteral.ts';
import MapType from '#nodes/MapType.ts';
import Markup from '#nodes/Markup.ts';
import Mention from '#nodes/Mention.ts';
import Match from '#nodes/Match.ts';
import Name from '#nodes/Name.ts';
import NameType from '#nodes/NameType.ts';
import Names from '#nodes/Names.ts';
import type Node from '#nodes/Node.ts';
import NoneLiteral from '#nodes/NoneLiteral.ts';
import NoneType from '#nodes/NoneType.ts';
import NumberLiteral from '#nodes/NumberLiteral.ts';
import NumberType from '#nodes/NumberType.ts';
import Otherwise from '#nodes/Otherwise.ts';
import Paragraph from '#nodes/Paragraph.ts';
import Previous from '#nodes/Previous.ts';
import Program from '#nodes/Program.ts';
import PropertyBind from '#nodes/PropertyBind.ts';
import PropertyReference from '#nodes/PropertyReference.ts';
import Reaction from '#nodes/Reaction.ts';
import Reference from '#nodes/Reference.ts';
import Row from '#nodes/Row.ts';
import Select from '#nodes/Select.ts';
import SetLiteral from '#nodes/SetLiteral.ts';
import SetOrMapAccess from '#nodes/SetOrMapAccess.ts';
import SetType from '#nodes/SetType.ts';
import Source from '#nodes/Source.ts';
import Spread from '#nodes/Spread.ts';
import StreamType from '#nodes/StreamType.ts';
import StructureDefinition from '#nodes/StructureDefinition.ts';
import StructureType from '#nodes/StructureType.ts';
import TableLiteral from '#nodes/TableLiteral.ts';
import TableType from '#nodes/TableType.ts';
import TextLiteral from '#nodes/TextLiteral.ts';
import TextType from '#nodes/TextType.ts';
import This from '#nodes/This.ts';
import Token from '#nodes/Token.ts';
import Translation from '#nodes/Translation.ts';
import Type from '#nodes/Type.ts';
import TypeInputs from '#nodes/TypeInputs.ts';
import TypePlaceholder from '#nodes/TypePlaceholder.ts';
import TypeVariable from '#nodes/TypeVariable.ts';
import TypeVariables from '#nodes/TypeVariables.ts';
import UnaryEvaluate from '#nodes/UnaryEvaluate.ts';
import UnionType from '#nodes/UnionType.ts';
import Unit from '#nodes/Unit.ts';
import UnparsableExpression from '#nodes/UnparsableExpression.ts';
import UnparsableType from '#nodes/UnparsableType.ts';
import Update from '#nodes/Update.ts';
import VariableType from '#nodes/VariableType.ts';
import WebLink from '#nodes/WebLink.ts';
import Words from '#nodes/Words.ts';
import type { Format } from '#components/editor/nodes/NodeView.svelte';
import NoneOrView from '#components/editor/nodes/OtherwiseView.svelte';
import VariableTypeView from '#components/editor/nodes/VariableTypeView.svelte';

/** A view of a particular kind of node, as that view declares itself. */
type NodeViewOf<Kind extends Node> = Component<{
    node: Kind;
    format: Format;
    /** Whether this node is folded; views that support code folding render a
     *  collapsed header when true. Ignored by views that don't. */
    folded?: boolean;
}>;

/** A view as `NodeView` renders it, which knows only that it has a node. */
type NodeViewComponent = NodeViewOf<Node>;

/**
 * A registered view as the component NodeView renders. Each view declares the
 * node class it draws, and Svelte compares a component's props strictly, so a
 * registry of views for different node classes cannot be typed without this.
 * What makes the lookup right is that the map is keyed by the very class each
 * view declares, which `map` below checks.
 */
function asNodeView(view: NodeViewOf<never>): NodeViewComponent {
    // sound: the registry is keyed by the node class each view declares, so the
    // node handed back is always of the class that view asked for.
    return view as NodeViewComponent;
}

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
    component: NodeViewOf<Kind>,
    style: BlockStyle,
) {
    nodeToView.set(nodeType, { component: asNodeView(component), style });
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
// A `$name` mention and its `[…|…]` branch are markup a translator edits, so they
// need views like any other segment; without them both fell through to
// UnknownNodeView, which renders the descriptor on an error background.
map(ExternalExample, ExternalExampleView, {
    kind: 'plain',
    direction: 'inline',
    size: 'normal',
});
map(Mention, MentionView, {
    kind: 'plain',
    direction: 'inline',
    size: 'normal',
});
map(Branch, BranchView, {
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
// Each pattern node has a bespoke view (LANGUAGE.md), so blocks mode can style
// constructs distinctly and container nodes (literal/group/set/look/case-fold)
// support code folding. The literal is the data container; its internals are
// structural ('plain'), and the type carries the 'type' chrome.
map(PatternLiteral, PatternLiteralView, {
    kind: 'data',
    direction: 'inline',
    size: 'normal',
});
map(PatternType, PatternTypeView, {
    kind: 'type',
    direction: 'inline',
    size: 'small',
});
map(PatternSequence, PatternSequenceView, {
    kind: 'plain',
    direction: 'inline',
    size: 'normal',
});
map(PatternGroup, PatternGroupView, {
    kind: 'plain',
    direction: 'inline',
    size: 'normal',
});
map(PatternSet, PatternSetView, {
    kind: 'plain',
    direction: 'inline',
    size: 'normal',
});
map(PatternLook, PatternLookView, {
    kind: 'plain',
    direction: 'inline',
    size: 'normal',
});
map(PatternCaseFold, PatternCaseFoldView, {
    kind: 'plain',
    direction: 'inline',
    size: 'normal',
});
map(PatternQuantified, PatternQuantifiedView, {
    kind: 'plain',
    direction: 'inline',
    size: 'normal',
});
map(PatternQuantifier, PatternQuantifierView, {
    kind: 'plain',
    direction: 'inline',
    size: 'normal',
});
map(PatternCapture, PatternCaptureView, {
    kind: 'plain',
    direction: 'inline',
    size: 'normal',
});
map(PatternComplement, PatternComplementView, {
    kind: 'plain',
    direction: 'inline',
    size: 'normal',
});
map(PatternClass, PatternClassView, {
    kind: 'plain',
    direction: 'inline',
    size: 'normal',
});
map(PatternProperty, PatternPropertyView, {
    kind: 'type',
    direction: 'inline',
    size: 'small',
});
map(PatternWord, PatternWordView, {
    kind: 'plain',
    direction: 'inline',
    size: 'normal',
});
map(PatternWordEdge, PatternWordEdgeView, {
    kind: 'plain',
    direction: 'inline',
    size: 'normal',
});
map(PatternLiteralText, PatternLiteralTextView, {
    kind: 'plain',
    direction: 'inline',
    size: 'normal',
});
map(PatternAnchor, PatternAnchorView, {
    kind: 'plain',
    direction: 'inline',
    size: 'normal',
});
map(PatternBackref, PatternBackrefView, {
    kind: 'plain',
    direction: 'inline',
    size: 'normal',
});
map(PatternRest, PatternRestView, {
    kind: 'plain',
    direction: 'inline',
    size: 'normal',
});
map(PatternRange, PatternRangeView, {
    kind: 'plain',
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
map(Localized, LocalizedView, {
    kind: 'evaluate',
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
