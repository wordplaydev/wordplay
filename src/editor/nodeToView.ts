import UnparsableView from "./UnparsableView.svelte";
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
import SetLiteralView from "./SetLiteralView.svelte";
import MapLiteralView from "./MapLiteralView.svelte";
import KeyValueView from "./KeyValueView.svelte";
import SetOrMapAccessView from "./SetOrMapAccessView.svelte";
import SetTypeView from "./MapTypeView.svelte";
import MapTypeView from "./SetTypeView.svelte";
import ListAccessView from "./ListAccessView.svelte";
import ConversionDefinitionView from "./ConversionDefinitionView.svelte";
import PreviousView from "./PreviousView.svelte";
import StreamTypeView from "./StreamTypeView.svelte";
import IsView from "./IsView.svelte";
import UnionTypeView from "./UnionTypeView.svelte";
import DocumentationView from "./DocumentationView.svelte";
import TableTypeView from "./TableTypeView.svelte";
import ColumnTypeView from "./ColumnTypeView.svelte";
import TableLiteralView from "./TableLiteralView.svelte";
import ColumnView from "./ColumnView.svelte";
import RowView from "./RowView.svelte";
import CellView from "./CellView.svelte";
import FunctionTypeView from "./FunctionTypeView.svelte";
import ThisView from "./ThisView.svelte";

import InsertView from "./InsertView.svelte";
import DeleteView from "./DeleteView.svelte";
import UpdateView from "./UpdateView.svelte";
import SelectView from "./SelectView.svelte";
import TokenView from "./TokenView.svelte";
import ProgramView from "./ProgramView.svelte";
import TypeInputView from "./TypeInputView.svelte";
import Program from "../nodes/Program";
import Token from "../nodes/Token";
import Unparsable from "../nodes/Unparsable";
import Documentation from "../nodes/Documentation";
import Borrow from "../nodes/Borrow";
import Share from "../nodes/Share";
import Block from "../nodes/Block";
import Bind from "../nodes/Bind";
import Alias from "../nodes/Alias";
import Language from "../nodes/Language";
import Name from "../nodes/Name";
import StructureDefinition from "../nodes/StructureDefinition";
import AccessName from "../nodes/AccessName";
import NameType from "../nodes/NameType";
import TypeVariable from "../nodes/TypeVariable";
import TypeInput from "../nodes/TypeInput";
import TextLiteral from "../nodes/TextLiteral";
import Template from "../nodes/Template";
import TextType from "../nodes/TextType";
import FunctionDefinition from "../nodes/FunctionDefinition";
import FunctionType from "../nodes/FunctionType";
import Evaluate from "../nodes/Evaluate";
import ExpressionPlaceholder from "../nodes/ExpressionPlaceholder";
import BinaryOperation from "../nodes/BinaryOperation";
import UnaryOperation from "../nodes/UnaryOperation";
import Convert from "../nodes/Convert";
import ConversionDefinition from "../nodes/ConversionDefinition";
import Conditional from "../nodes/Conditional";
import MeasurementLiteral from "../nodes/MeasurementLiteral";
import MeasurementType from "../nodes/MeasurementType";
import Unit from "../nodes/Unit";
import BooleanLiteral from "../nodes/BooleanLiteral";
import BooleanType from "../nodes/BooleanType";
import NoneLiteral from "../nodes/NoneLiteral";
import NoneType from "../nodes/NoneType";
import SetLiteral from "../nodes/SetLiteral";
import MapLiteral from "../nodes/MapLiteral";
import KeyValue from "../nodes/KeyValue";
import SetOrMapAccess from "../nodes/SetOrMapAccess";
import SetType from "../nodes/SetType";
import MapType from "../nodes/MapType";
import ListLiteral from "../nodes/ListLiteral";
import ListAccess from "../nodes/ListAccess";
import ListType from "../nodes/ListType";
import TableLiteral from "../nodes/TableLiteral";
import TableType from "../nodes/TableType";
import Column from "../nodes/Column";
import ColumnType from "../nodes/ColumnType";
import Row from "../nodes/Row";
import Cell from "../nodes/Cell";
import Insert from "../nodes/Insert";
import Delete from "../nodes/Delete";
import Update from "../nodes/Update";
import Select from "../nodes/Select";
import Reaction from "../nodes/Reaction";
import Previous from "../nodes/Previous";
import StreamType from "../nodes/StreamType";
import UnionType from "../nodes/UnionType";
import TypePlaceholder from "../nodes/TypePlaceholder";
import Is from "../nodes/Is";
import This from "../nodes/This";

const nodeToView = new Map<Function, ConstructorOfATypedSvelteComponent>();
nodeToView.set(Program, ProgramView);
nodeToView.set(Token, TokenView);
nodeToView.set(Unparsable, UnparsableView);
nodeToView.set(Documentation, DocumentationView);

nodeToView.set(Borrow, BorrowView);
nodeToView.set(Share, ShareView);

nodeToView.set(Block, BlockView);

nodeToView.set(Bind, BindView);
nodeToView.set(Alias, AliasView);
nodeToView.set(Language, LanguageView);
nodeToView.set(Name, NameView);

nodeToView.set(StructureDefinition, StructureDefinitionView);
nodeToView.set(AccessName, AccessNameView);
nodeToView.set(NameType, NameTypeView);

nodeToView.set(TypeVariable, TypeVariableView);
nodeToView.set(TypeInput, TypeInputView);

nodeToView.set(TextLiteral, TextLiteralView);
nodeToView.set(Template, TemplateView);
nodeToView.set(TextType, TextTypeView);

nodeToView.set(FunctionDefinition, FunctionDefinitionView);
nodeToView.set(FunctionType, FunctionTypeView);
nodeToView.set(Evaluate, EvaluateView);

nodeToView.set(ExpressionPlaceholder, ExpressionPlaceholderView);
nodeToView.set(BinaryOperation, BinaryOperationView);
nodeToView.set(UnaryOperation, UnaryOperationView);

nodeToView.set(Convert, ConvertView);
nodeToView.set(ConversionDefinition, ConversionDefinitionView);

nodeToView.set(Conditional, ConditionalView);

nodeToView.set(MeasurementLiteral, MeasurementLiteralView);
nodeToView.set(MeasurementType, MeasurementTypeView);
nodeToView.set(Unit, UnitView);

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
nodeToView.set(ListAccess, ListAccessView);
nodeToView.set(ListType, ListTypeView);

nodeToView.set(TableLiteral, TableLiteralView);
nodeToView.set(TableType, TableTypeView);
nodeToView.set(Column, ColumnView);
nodeToView.set(ColumnType, ColumnTypeView);
nodeToView.set(Row, RowView);
nodeToView.set(Cell, CellView);
nodeToView.set(Insert, InsertView);
nodeToView.set(Delete, DeleteView);
nodeToView.set(Update, UpdateView);
nodeToView.set(Select, SelectView);

nodeToView.set(Reaction, ReactionView);
nodeToView.set(Previous, PreviousView);
nodeToView.set(StreamType, StreamTypeView);

nodeToView.set(UnionType, UnionTypeView);
nodeToView.set(TypePlaceholder, TypePlaceholderView);
nodeToView.set(Is, IsView);

nodeToView.set(This, ThisView);

export default nodeToView;