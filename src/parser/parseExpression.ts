import BinaryEvaluate from '../nodes/BinaryEvaluate';
import Block, { BlockKind } from '../nodes/Block';
import BooleanLiteral from '../nodes/BooleanLiteral';
import Conditional from '../nodes/Conditional';
import Evaluate from '../nodes/Evaluate';
import type Expression from '../nodes/Expression';
import Is from '../nodes/Is';
import Sym from '../nodes/Sym';
import This from '../nodes/This';
import UnaryEvaluate from '../nodes/UnaryEvaluate';
import UnparsableExpression from '../nodes/UnparsableExpression';
import parseBind, { nextIsBind, parseNames } from './parseBind';
import type Tokens from './Tokens';
import ListLiteral from '@nodes/ListLiteral';
import type Bind from '@nodes/Bind';
import PropertyReference from '@nodes/PropertyReference';
import FunctionDefinition from '@nodes/FunctionDefinition';
import NoneLiteral from '@nodes/NoneLiteral';
import NumberLiteral from '@nodes/NumberLiteral';
import TextLiteral from '@nodes/TextLiteral';
import KeyValue from '@nodes/KeyValue';
import ListAccess from '@nodes/ListAccess';
import Row from '@nodes/Row';
import TableLiteral from '@nodes/TableLiteral';
import Select from '@nodes/Select';
import Insert from '@nodes/Insert';
import Update from '@nodes/Update';
import Delete from '@nodes/Delete';
import ConversionDefinition from '@nodes/ConversionDefinition';
import Reaction from '@nodes/Reaction';
import SetOrMapAccess from '@nodes/SetOrMapAccess';
import Reference from '@nodes/Reference';
import Convert from '@nodes/Convert';
import Unit from '@nodes/Unit';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import Previous from '@nodes/Previous';
import MapLiteral from '@nodes/MapLiteral';
import SetLiteral from '@nodes/SetLiteral';
import TypeInputs from '@nodes/TypeInputs';
import Dimension from '@nodes/Dimension';
import DocumentedExpression from '@nodes/DocumentedExpression';
import TypeVariables from '@nodes/TypeVariables';
import TypeVariable from '@nodes/TypeVariable';
import Changed from '@nodes/Changed';
import PropertyBind from '../nodes/PropertyBind';
import Initial from '../nodes/Initial';
import IsLocale from '../nodes/IsLocale';
import parseLanguage from './parseLanguage';
import StructureDefinition from '../nodes/StructureDefinition';
import type Type from '../nodes/Type';
import parseType, { parseTableType } from './parseType';
import Translation, { type TranslationSegment } from '../nodes/Translation';
import parseMarkup, { parseExample } from './parseMarkup';
import { EXPONENT_SYMBOL, PRODUCT_SYMBOL } from './Symbols';
import FormattedTranslation from '../nodes/FormattedTranslation';
import FormattedLiteral from '../nodes/FormattedLiteral';
import { toTokens } from './toTokens';
import Docs from '../nodes/Docs';
import parseDoc from './parseDoc';
import type Doc from '../nodes/Doc';
import Spread from '../nodes/Spread';
import Otherwise from '@nodes/Otherwise';

export function toExpression(code: string): Expression {
    return parseExpression(toTokens(code));
}

export function parseDocs(tokens: Tokens): Docs {
    const docs: Doc[] = [];
    do {
        docs.push(parseDoc(tokens));
    } while (
        tokens.nextIs(Sym.Doc) &&
        (tokens.peekSpace()?.split('\n').length ?? 0) - 1 <= 1
    );
    return new Docs([docs[0], ...docs.slice(1)]);
}

export default function parseExpression(tokens: Tokens): Expression {
    let left = parseBinaryEvaluate(tokens);

    // Is it none or statement?
    if (tokens.nextIs(Sym.Otherwise)) left = parseNoneOr(left, tokens);
    // Is it conditional statement?
    if (tokens.nextIs(Sym.Conditional)) left = parseConditional(left, tokens);

    // Is it a reaction and are reactions allowed?
    if (tokens.nextIs(Sym.Stream) && tokens.reactionsAllowed())
        left = parseReaction(left, tokens);

    // Return whatever expression we got
    return left;
}

export function parseBlock(
    tokens: Tokens,
    kind: BlockKind = BlockKind.Block,
    doc = false
): Block {
    const root = kind === BlockKind.Root;

    // Grab any documentation if this isn't a root.
    const docs = root
        ? undefined
        : tokens.nextIs(Sym.Doc)
        ? parseDocs(tokens)
        : undefined;

    const open = root
        ? undefined
        : tokens.nextIs(Sym.EvalOpen)
        ? tokens.read(Sym.EvalOpen)
        : undefined;

    const statements = [];
    // Keep reading binds and expressions until
    // 1) there are no more tokens and one the following is true:
    //  a) It's a root and not a doc
    //  b) It's not a root or a doc and the next is an eval close
    //  c) It's a doc and the next is an example close
    while (
        tokens.hasNext() &&
        ((root && !doc) ||
            (!root && !doc && tokens.nextIsnt(Sym.EvalClose)) ||
            (doc && tokens.nextIsnt(Sym.Code)))
    )
        statements.push(
            nextIsBind(tokens, true)
                ? parseBind(tokens)
                : parseExpression(tokens)
        );

    const close = root
        ? undefined
        : tokens.nextIs(Sym.EvalClose)
        ? tokens.read(Sym.EvalClose)
        : undefined;

    return new Block(statements, kind, open, close, docs);
}

export function parseNoneOr(left: Expression, tokens: Tokens): Otherwise {
    const coalesce = tokens.read(Sym.Otherwise);
    const right = parseExpression(tokens);
    return new Otherwise(left, coalesce, right);
}

export function parseConditional(
    condition: Expression,
    tokens: Tokens
): Conditional {
    const question = tokens.read(Sym.Conditional);
    const yes = parseExpression(tokens);
    const no = parseExpression(tokens);
    return new Conditional(condition, question, yes, no);
}

export function parseBinaryEvaluate(tokens: Tokens): Expression {
    let left = parseAtomicExpression(tokens);

    while (
        tokens.hasNext() &&
        !tokens.nextIsUnary() &&
        (tokens.nextIs(Sym.Operator) ||
            (tokens.nextIs(Sym.TypeOperator) &&
                !tokens.nextHasPrecedingLineBreak()))
    ) {
        left = tokens.nextIs(Sym.TypeOperator)
            ? new Is(left, tokens.read(Sym.TypeOperator), parseType(tokens))
            : new BinaryEvaluate(
                  left,
                  parseReference(tokens),
                  parseAtomicExpression(tokens)
              );
    }
    return left;
}

function parseAtomicExpression(tokens: Tokens): Expression {
    // All expressions must start with one of the following
    let left: Expression =
        // This
        tokens.nextIs(Sym.This)
            ? new This(tokens.read(Sym.This))
            : // Placeholder
            tokens.nextIs(Sym.Placeholder)
            ? parsePlaceholder(tokens)
            : // Start
            tokens.nextIs(Sym.Initial)
            ? parseInitial(tokens)
            : // Change
            tokens.nextIs(Sym.Change)
            ? parseChanged(tokens)
            : // Nones
            tokens.nextIs(Sym.None)
            ? parseNone(tokens)
            : // Unary expressions before names and binary operators, since some unary can be multiple.
            tokens.nextIsUnary()
            ? new UnaryEvaluate(
                  parseReference(tokens),
                  parseAtomicExpression(tokens)
              )
            : // References can be names or binary operators
            tokens.nextIsOneOf(Sym.Name, Sym.Operator)
            ? parseReference(tokens)
            : // Booleans
            tokens.nextIs(Sym.Boolean)
            ? new BooleanLiteral(tokens.read(Sym.Boolean))
            : // Numbers with units
            tokens.nextIs(Sym.Number)
            ? parseNumber(tokens)
            : // Text with optional formats
            tokens.nextIs(Sym.Text)
            ? parseText(tokens)
            : // A list
            tokens.nextIs(Sym.ListOpen)
            ? parseList(tokens)
            : // A set or map
            tokens.nextIs(Sym.SetOpen)
            ? parseSetOrMap(tokens)
            : // Table literals
            tokens.nextIs(Sym.TableOpen)
            ? parseTable(tokens)
            : // A block expression
            nextAreOptionalDocsThen(tokens, [Sym.EvalOpen])
            ? parseBlock(tokens, BlockKind.Block)
            : // A structure definition
            nextAreOptionalDocsThen(tokens, [Sym.Type]) ||
              nextAreOptionalDocsThen(tokens, [Sym.Share, Sym.Type])
            ? parseStructure(tokens)
            : // A function function
            nextAreOptionalDocsThen(tokens, [Sym.Function]) ||
              nextAreOptionalDocsThen(tokens, [Sym.Share, Sym.Function])
            ? parseFunction(tokens)
            : // A conversion function.
            nextAreOptionalDocsThen(tokens, [Sym.Convert])
            ? parseConversion(tokens)
            : tokens.nextIs(Sym.Previous)
            ? parsePrevious(tokens)
            : tokens.nextIs(Sym.Formatted)
            ? parseFormattedLiteral(tokens)
            : tokens.nextIs(Sym.Locale)
            ? parseIsLocale(tokens)
            : // A documented expression
            tokens.nextIs(Sym.Doc)
            ? parseDocumentedExpression(tokens)
            : // Unknown expression? Parse something appropriate.
              parseUnparsable(tokens);

    // But wait! Is it one or more infix expressions? Slurp them up.
    let match = false;
    do {
        match = true;
        if (tokens.nextIs(Sym.Access))
            left = parsePropertyReference(left, tokens);
        else if (
            tokens.nextIs(Sym.ListOpen) &&
            tokens.nextLacksPrecedingSpace()
        )
            left = parseListAccess(left, tokens);
        else if (tokens.nextIs(Sym.SetOpen) && tokens.nextLacksPrecedingSpace())
            left = parseSetOrMapAccess(left, tokens);
        else if (nextIsEvaluate(tokens)) left = parseEvaluate(left, tokens);
        else if (tokens.nextIs(Sym.Convert)) left = parseConvert(left, tokens);
        else if (tokens.nextIs(Sym.Select)) left = parseSelect(left, tokens);
        else if (tokens.nextIs(Sym.Insert)) left = parseInsert(left, tokens);
        else if (tokens.nextIs(Sym.Update)) left = parseUpdate(left, tokens);
        else if (tokens.nextIs(Sym.Delete)) left = parseDelete(left, tokens);
        else match = false;
    } while (match);
    return left;
}

function parsePlaceholder(tokens: Tokens): ExpressionPlaceholder {
    const placeholder = tokens.read(Sym.Placeholder);

    let dot;
    let type;
    if (tokens.nextIs(Sym.Type)) {
        dot = tokens.read(Sym.Type);
        type = parseType(tokens);
    }

    return new ExpressionPlaceholder(placeholder, dot, type);
}

function parseInitial(tokens: Tokens): Initial {
    const diamond = tokens.read(Sym.Initial);
    return new Initial(diamond);
}

export function parseReference(tokens: Tokens): Reference {
    const name = tokens.read(
        tokens.nextIs(Sym.Operator) ? Sym.Operator : Sym.Name
    );

    return new Reference(name);
}

function parseChanged(tokens: Tokens): Changed {
    const change = tokens.read(Sym.Change);
    const stream = parseAtomicExpression(tokens);

    return new Changed(change, stream);
}

function parseIsLocale(tokens: Tokens): IsLocale {
    const locale = tokens.read(Sym.Locale);
    const language = tokens.nextIs(Sym.Language)
        ? parseLanguage(tokens)
        : undefined;
    return new IsLocale(locale, language);
}

function parseDocumentedExpression(tokens: Tokens): Expression {
    const docs = parseDocs(tokens);
    const expression = parseExpression(tokens);
    return new DocumentedExpression(docs, expression);
}

function parseNone(tokens: Tokens): NoneLiteral {
    const error = tokens.read(Sym.None);
    return new NoneLiteral(error);
}

export function parseNumber(tokens: Tokens): NumberLiteral {
    const number = tokens.read(Sym.Number);
    const unit =
        tokens.nextIsOneOf(Sym.Name, Sym.Language) &&
        tokens.nextLacksPrecedingSpace()
            ? parseUnit(tokens)
            : undefined;
    return new NumberLiteral(number, unit ?? Unit.Empty);
}

export function parseUnit(tokens: Tokens): Unit | undefined {
    // A unit is just a series of names, carets, numbers, and product symbols not separated by spaces.
    const numerator: Dimension[] = [];

    while (
        (tokens.nextIs(Sym.Name) ||
            tokens.nextIs(Sym.Operator, PRODUCT_SYMBOL)) &&
        tokens.nextLacksPrecedingSpace()
    )
        numerator.push(parseDimension(tokens));

    let slash = undefined;
    const denominator: Dimension[] = [];
    if (tokens.nextIs(Sym.Language)) {
        slash = tokens.read(Sym.Language);
        while (
            (tokens.nextIs(Sym.Name) ||
                tokens.nextIs(Sym.Operator, PRODUCT_SYMBOL)) &&
            tokens.nextLacksPrecedingSpace()
        )
            denominator.push(parseDimension(tokens));
    }

    return numerator.length === 0 &&
        denominator.length === 0 &&
        slash === undefined
        ? undefined
        : new Unit(undefined, numerator, slash, denominator);
}

/** DIMENSION :: NAME (^NUMBER)? */
function parseDimension(tokens: Tokens): Dimension {
    const product = tokens.nextIs(Sym.Operator, PRODUCT_SYMBOL)
        ? tokens.read(Sym.Operator)
        : undefined;
    const name = tokens.nextIs(Sym.Name) ? tokens.read(Sym.Name) : undefined;
    let caret = undefined;
    let exponent = undefined;
    if (
        tokens.nextIs(Sym.Operator, EXPONENT_SYMBOL) &&
        tokens.nextLacksPrecedingSpace()
    ) {
        caret = tokens.read(Sym.Operator);
        exponent =
            tokens.nextIs(Sym.Number) && tokens.nextLacksPrecedingSpace()
                ? tokens.read(Sym.Number)
                : undefined;
    }
    return new Dimension(product, name, caret, exponent);
}

function parseText(tokens: Tokens): TextLiteral {
    const texts: Translation[] = [];

    // Read a series of Translations lacking separating space.
    do {
        texts.push(parseTranslation(tokens));
    } while (tokens.nextIs(Sym.Text) && tokens.nextLacksPrecedingSpace());

    return new TextLiteral(texts);
}

function parseTranslation(tokens: Tokens): Translation {
    const text = tokens.read(Sym.Text);
    const segments: TranslationSegment[] = [];
    while (tokens.nextIs(Sym.Words) || tokens.nextIs(Sym.Code)) {
        if (tokens.nextIs(Sym.Words)) segments.push(tokens.read(Sym.Words));
        else if (tokens.nextIs(Sym.Code)) segments.push(parseExample(tokens));
    }
    const close = tokens.nextIs(Sym.Text) ? tokens.read(Sym.Text) : undefined;
    const language = tokens.nextIs(Sym.Language)
        ? parseLanguage(tokens)
        : undefined;
    return new Translation(text, segments, close, language);
}

function parseList(tokens: Tokens): ListLiteral {
    const open = tokens.read(Sym.ListOpen);
    const values: (Spread | Expression)[] = [];

    while (
        tokens.hasNext() &&
        tokens.nextIsnt(Sym.ListClose) &&
        tokens.nextIsnt(Sym.Code)
    ) {
        // Is there a spread next? Parse it.
        if (tokens.nextIs(Sym.Bind)) {
            const dots = tokens.read(Sym.Bind);
            const value =
                tokens.hasNext() &&
                tokens.nextIsnt(Sym.ListClose) &&
                tokens.nextIsnt(Sym.Code)
                    ? parseExpression(tokens)
                    : undefined;
            values.push(new Spread(dots, value));
        } else values.push(parseExpression(tokens));
    }

    const close = tokens.readIf(Sym.ListClose);

    const literal = tokens.readIf(Sym.Literal);

    return new ListLiteral(open, values, close, literal);
}

function parseListAccess(left: Expression, tokens: Tokens): Expression {
    do {
        const open = tokens.read(Sym.ListOpen);
        const index = parseExpression(tokens);
        const close = tokens.readIf(Sym.ListClose);

        left = new ListAccess(left, open, index, close);

        // But wait, is it a function evaluation?
        if (nextIsEvaluate(tokens) && tokens.nextLacksPrecedingSpace())
            left = parseEvaluate(left, tokens);
    } while (tokens.nextIs(Sym.ListOpen));

    // Return the series of accesses and evaluations we created.
    return left;
}

function parseSetOrMap(tokens: Tokens): MapLiteral | SetLiteral {
    const open = tokens.read(Sym.SetOpen);
    const values: (Expression | KeyValue)[] = [];

    // Is this an empty map?
    if (tokens.nextAre(Sym.Bind, Sym.SetClose)) {
        const bind = tokens.read(Sym.Bind);
        return new MapLiteral(open, [], bind, tokens.read(Sym.SetClose));
    }

    while (
        tokens.hasNext() &&
        tokens.nextIsnt(Sym.SetClose) &&
        tokens.nextIsnt(Sym.Code)
    ) {
        const key = parseExpression(tokens);
        if (tokens.nextIs(Sym.Bind)) {
            const bind = tokens.read(Sym.Bind);
            const value = parseExpression(tokens);
            values.push(new KeyValue(key, value, bind));
        } else values.push(key);
    }

    const close = tokens.readIf(Sym.SetClose);

    const literal = tokens.readIf(Sym.Literal);

    // Make a map
    return values.some((v): v is KeyValue => v instanceof KeyValue)
        ? new MapLiteral(open, values, undefined, close, literal)
        : new SetLiteral(open, values as Expression[], close, literal);
}

function parseSetOrMapAccess(left: Expression, tokens: Tokens): Expression {
    do {
        const open = tokens.read(Sym.SetOpen);
        const key = parseExpression(tokens);

        const close = tokens.nextIs(Sym.SetClose)
            ? tokens.read(Sym.SetClose)
            : undefined;

        left = new SetOrMapAccess(left, open, key, close);

        // But wait, is it a function evaluation?
        if (nextIsEvaluate(tokens) && tokens.nextLacksPrecedingSpace())
            left = parseEvaluate(left, tokens);
    } while (tokens.hasNext() && tokens.nextIs(Sym.SetOpen));

    // Return the series of accesses and evaluations we created.
    return left;
}

function parsePrevious(tokens: Tokens): Previous {
    const previous = tokens.read(Sym.Previous);
    const range = tokens.nextIs(Sym.Previous)
        ? tokens.read(Sym.Previous)
        : undefined;
    const index = parseExpression(tokens);
    const stream = parseExpression(tokens);

    return new Previous(previous, range, index, stream);
}

function parseTable(tokens: Tokens): TableLiteral {
    const type = parseTableType(tokens);

    // Read the rows.
    const rows = [];
    while (tokens.nextIs(Sym.TableOpen)) rows.push(parseRow(tokens));

    return new TableLiteral(type, rows);
}

function parseRow(tokens: Tokens, expected: Sym = Sym.TableOpen): Row {
    const open = tokens.read(expected);

    // Don't allow reactions on row values.
    tokens.pushReactionAllowed(false);

    const cells: (Bind | Expression)[] = [];
    // Read the cells.
    while (
        tokens.hasNext() &&
        tokens.nextIsnt(Sym.Code) &&
        !tokens.nextIs(Sym.TableClose) &&
        !tokens.nextHasPrecedingLineBreak()
    )
        cells.push(
            nextIsBind(tokens, true)
                ? parseBind(tokens)
                : parseExpression(tokens)
        );

    // Read the closing row marker.
    const close = tokens.readIf(Sym.TableClose);

    // Restore previous allowance.
    tokens.popReactionAllowed();

    return new Row(open, cells, close);
}

function parseSelect(table: Expression, tokens: Tokens): Select {
    const row = parseRow(tokens, Sym.Select);
    const query = parseExpression(tokens);

    return new Select(table, row, query);
}

function parseInsert(table: Expression, tokens: Tokens): Insert {
    const row = parseRow(tokens, Sym.Insert);

    return new Insert(table, row);
}

function parseUpdate(table: Expression, tokens: Tokens): Update {
    const row = parseRow(tokens, Sym.Update);
    const query = parseExpression(tokens);

    return new Update(table, row, query);
}

function parseDelete(table: Expression, tokens: Tokens): Delete {
    const del = tokens.read(Sym.Delete);
    const query = parseExpression(tokens);

    return new Delete(table, del, query);
}

function parseReaction(initial: Expression, tokens: Tokens): Reaction {
    const dots = tokens.read(Sym.Stream);
    // Parse the condition, but don't allow reactions.
    tokens.pushReactionAllowed(false);
    const condition = parseExpression(tokens);
    const nextdots = tokens.nextIs(Sym.Stream)
        ? tokens.read(Sym.Stream)
        : undefined;
    // Parse the next value expression, still not allowing reactions.
    const next = parseExpression(tokens);
    // Revert to previous reactions allowed state.
    tokens.popReactionAllowed();
    return new Reaction(initial, dots, condition, nextdots, next);
}

export function parseFunction(tokens: Tokens): FunctionDefinition {
    const docs = tokens.nextIs(Sym.Doc) ? parseDocs(tokens) : undefined;
    const share = tokens.nextIs(Sym.Share) ? tokens.read(Sym.Share) : undefined;

    const fun = tokens.read(Sym.Function);
    const names = parseNames(tokens);

    const types = tokens.nextIs(Sym.TypeOpen)
        ? parseTypeVariables(tokens)
        : undefined;

    const open = tokens.nextIs(Sym.EvalOpen)
        ? tokens.read(Sym.EvalOpen)
        : undefined;

    // Don't allow reactions on input binds values.
    tokens.pushReactionAllowed(false);

    const inputs: Bind[] = [];
    while (
        tokens.hasNext() &&
        tokens.nextIsnt(Sym.Code) &&
        tokens.nextIsnt(Sym.EvalClose) &&
        nextIsBind(tokens, false)
    )
        inputs.push(parseBind(tokens));

    // Restore
    tokens.popReactionAllowed();

    const close = tokens.nextIs(Sym.EvalClose)
        ? tokens.read(Sym.EvalClose)
        : undefined;

    let dot;
    let output;
    if (tokens.nextIs(Sym.Type)) {
        dot = tokens.read(Sym.Type);
        output = parseType(tokens);
    }

    let expression =
        !tokens.hasNext() || tokens.nextHasMoreThanOneLineBreak()
            ? undefined
            : parseExpression(tokens);

    if (expression instanceof Block) expression = expression.asFunctionBlock();

    return new FunctionDefinition(
        docs,
        share,
        fun,
        names,
        types,
        open,
        inputs,
        close,
        dot,
        output,
        expression
    );
}

export function parseStructure(tokens: Tokens): StructureDefinition {
    const docs = tokens.nextIs(Sym.Doc) ? parseDocs(tokens) : undefined;
    const share = tokens.nextIs(Sym.Share) ? tokens.read(Sym.Share) : undefined;

    const type = tokens.read(Sym.Type);
    const names = parseNames(tokens);

    const interfaces: Reference[] = [];
    while (tokens.nextIs(Sym.Name)) interfaces.push(parseReference(tokens));

    const types = tokens.nextIs(Sym.TypeOpen)
        ? parseTypeVariables(tokens)
        : undefined;
    const open = tokens.nextIs(Sym.EvalOpen)
        ? tokens.read(Sym.EvalOpen)
        : undefined;

    // Don't allow reactions on structure input binds
    tokens.pushReactionAllowed(false);

    const inputs: Bind[] = [];
    while (tokens.nextIsnt(Sym.EvalClose) && nextIsBind(tokens, false))
        inputs.push(parseBind(tokens));

    // Restore
    tokens.popReactionAllowed();

    const close = tokens.nextIs(Sym.EvalClose)
        ? tokens.read(Sym.EvalClose)
        : undefined;
    const block = nextAreOptionalDocsThen(tokens, [Sym.EvalOpen])
        ? parseBlock(tokens, BlockKind.Structure)
        : undefined;

    return new StructureDefinition(
        docs,
        share,
        type,
        names,
        interfaces,
        types,
        open,
        inputs,
        close,
        block
    );
}

function nextIsEvaluate(tokens: Tokens): boolean {
    if (!tokens.nextLacksPrecedingSpace()) return false;

    const rollbackToken = tokens.peek();
    if (rollbackToken === undefined) return false;

    if (tokens.nextIs(Sym.TypeOpen)) parseTypeInputs(tokens);

    const nextIsEval = tokens.nextIs(Sym.EvalOpen);

    tokens.unreadTo(rollbackToken);

    return nextIsEval;
}

function parseEvaluate(left: Expression, tokens: Tokens): Evaluate {
    const types = tokens.nextIs(Sym.TypeOpen)
        ? parseTypeInputs(tokens)
        : undefined;

    const open = tokens.read(Sym.EvalOpen);
    const inputs: Expression[] = [];

    // This little peek at space just prevents runaway parsing. It uses space to make an assumption that everything below isn't part of the evaluate.
    while (
        tokens.hasNext() &&
        tokens.nextIsnt(Sym.Code) &&
        tokens.nextIsnt(Sym.EvalClose)
    )
        inputs.push(
            nextIsBind(tokens, true)
                ? parseBind(tokens)
                : parseExpression(tokens)
        );

    const close = tokens.readIf(Sym.EvalClose);

    return new Evaluate(left, types, open, inputs, close);
}

function parseConversion(tokens: Tokens): ConversionDefinition {
    const docs = tokens.nextIs(Sym.Doc) ? parseDocs(tokens) : undefined;
    const convert = tokens.read(Sym.Convert);
    const input = parseType(tokens, true);
    const output = parseType(tokens, true);
    const expression = parseExpression(tokens);

    return new ConversionDefinition(docs, convert, input, output, expression);
}

function parseConvert(expression: Expression, tokens: Tokens): Convert {
    const convert = tokens.read(Sym.Convert);
    const type = parseType(tokens, true);

    return new Convert(expression, convert, type);
}

export function parseTypeVariables(tokens: Tokens): TypeVariables {
    const open = tokens.read(Sym.TypeOpen);
    const variables: TypeVariable[] = [];
    while (tokens.hasNext() && tokens.nextIs(Sym.Name)) {
        const names = parseNames(tokens);
        let dot, type;
        if (tokens.nextIs(Sym.Type)) {
            dot = tokens.read(Sym.Type);
            type = parseType(tokens, false);
        }
        variables.push(new TypeVariable(names, dot, type));
    }
    const close = tokens.nextIs(Sym.TypeClose)
        ? tokens.read(Sym.TypeClose)
        : undefined;
    return new TypeVariables(open, variables, close);
}

export function parseTypeInputs(tokens: Tokens): TypeInputs {
    const open = tokens.read(Sym.TypeOpen);
    const inputs: Type[] = [];
    while (
        tokens.hasNext() &&
        tokens.nextIsnt(Sym.TypeClose) &&
        !tokens.nextHasPrecedingLineBreak()
    )
        inputs.push(parseType(tokens));
    const close = tokens.readIf(Sym.TypeClose);
    return new TypeInputs(open, inputs, close);
}

function parsePropertyReference(left: Expression, tokens: Tokens): Expression {
    if (!tokens.nextIs(Sym.Access)) return left;
    do {
        const access = tokens.read(Sym.Access);
        // See if there's a name, operator, or placeholder next, all of which are valid property names.
        // Note that we require it to be on the same line or the next line, but not later.
        let name;
        if (
            tokens.nextIsOneOf(Sym.Name, Sym.Placeholder, Sym.Operator) &&
            !tokens.nextHasMoreThanOneLineBreak()
        )
            name = tokens.read();

        left = new PropertyReference(
            left,
            access,
            name ? new Reference(name) : undefined
        );

        // If there's a bind symbol next, then parse a PropertyBind
        if (left instanceof PropertyReference && tokens.nextIs(Sym.Bind)) {
            const bind = tokens.read(Sym.Bind);
            const value = parseExpression(tokens);

            left = new PropertyBind(left, bind, value);
        }

        // But wait, is it a function evaluation?
        if (
            tokens.nextIsOneOf(Sym.EvalOpen, Sym.TypeOpen) &&
            tokens.nextLacksPrecedingSpace()
        )
            left = parseEvaluate(left, tokens);
    } while (tokens.nextIs(Sym.Access));

    // Return the series of accesses and evaluations we created.
    return left;
}

function parseUnparsable(tokens: Tokens): Expression {
    // Are there tokens? Make an unparsable expression with the tokens on the line.
    if (tokens.hasNext()) return new UnparsableExpression(tokens.readLine());

    // Otherwise, return an expression placeholder.
    return new ExpressionPlaceholder(undefined, undefined, undefined);
}

export function parseFormattedLiteral(tokens: Tokens): FormattedLiteral {
    const translations: FormattedTranslation[] = [];
    do {
        translations.push(parseFormattedTranslation(tokens));
    } while (tokens.nextIs(Sym.Formatted) && tokens.nextLacksPrecedingSpace());
    return new FormattedLiteral(translations);
}

export function parseFormattedTranslation(
    tokens: Tokens
): FormattedTranslation {
    const open = tokens.read(Sym.Formatted);
    const content = parseMarkup(tokens);
    const close = tokens.readIf(Sym.Formatted);
    const lang = tokens.nextIs(Sym.Language)
        ? parseLanguage(tokens)
        : undefined;
    return new FormattedTranslation(open, content, close, lang);
}

export function nextAreOptionalDocsThen(tokens: Tokens, types: Sym[]): boolean {
    const rollbackToken = tokens.peek();
    if (rollbackToken === undefined) return false;

    // We don't actually care what the docs are or if there are any.
    if (tokens.nextIs(Sym.Doc)) parseDocs(tokens);

    // Is the next the type?
    let matches = true;
    while (types.length > 0) {
        const next = types.shift();
        if (next) matches = tokens.nextIs(next);
        if (matches === false) break;
        tokens.read();
    }

    // Rollback
    tokens.unreadTo(rollbackToken);

    // It's a bind if it has a name and a bind symbol.
    return matches;
}
