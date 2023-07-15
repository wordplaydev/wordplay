import Token from './Token';
import TokenType from './TokenType';
import Type from './Type';
import type Context from './Context';
import { FUNCTION_SYMBOL } from '@parser/Symbols';
import Bind from './Bind';
import { getEvaluationInputConflicts } from './util';
import EvalCloseToken from './EvalCloseToken';
import EvalOpenToken from './EvalOpenToken';
import TypeVariables from './TypeVariables';
import type TypeSet from './TypeSet';
import type { NativeTypeName } from '../native/NativeConstants';
import type { Replacement } from './Node';
import type Locale from '@locale/Locale';
import Glyphs from '../lore/Glyphs';
import FunctionDefinition from './FunctionDefinition';
import Names from './Names';
import ExpressionPlaceholder from './ExpressionPlaceholder';
import Name from './Name';

export default class FunctionType extends Type {
    readonly fun: Token;
    readonly types: TypeVariables | undefined;
    readonly open: Token | undefined;
    readonly inputs: Bind[];
    readonly close: Token | undefined;
    readonly output: Type;

    /** An optional reference to the function from which this type came, used in type inference. */
    readonly definition: FunctionDefinition | undefined;

    constructor(
        fun: Token,
        types: TypeVariables | undefined,
        open: Token | undefined,
        inputs: Bind[],
        close: Token | undefined,
        output: Type,
        definition?: FunctionDefinition
    ) {
        super();

        this.fun = fun;
        this.types = types;
        this.open = open;
        this.inputs = inputs;
        this.close = close;
        this.output = output;
        this.definition = definition;

        this.computeChildren();
    }

    static make(
        typeVars: TypeVariables | undefined,
        inputs: Bind[],
        output: Type,
        definition?: FunctionDefinition
    ) {
        return new FunctionType(
            new Token(FUNCTION_SYMBOL, TokenType.Function),
            typeVars,
            new EvalOpenToken(),
            inputs,
            new EvalCloseToken(),
            output,
            definition
        );
    }

    getGrammar() {
        return [
            { name: 'fun', types: [Token] },
            { name: 'types', types: [TypeVariables, undefined] },
            { name: 'open', types: [Token] },
            { name: 'inputs', types: [[Bind]], space: true, indent: true },
            { name: 'close', types: [Token] },
            { name: 'output', types: [Type] },
        ];
    }

    clone(replace?: Replacement) {
        return new FunctionType(
            this.replaceChild('fun', this.fun, replace),
            this.replaceChild('types', this.types, replace),
            this.replaceChild('open', this.open, replace),
            this.replaceChild('inputs', this.inputs, replace),
            this.replaceChild('close', this.close, replace),
            this.replaceChild('output', this.output, replace)
        ) as this;
    }

    acceptsAll(types: TypeSet, context: Context): boolean {
        return types.list().every((type) => {
            if (!(type instanceof FunctionType)) return false;
            let inputsToCheck: Bind[] = type.inputs;
            let outputToCheck = type.output;

            if (!(outputToCheck instanceof Type)) return false;
            if (!this.output.accepts(outputToCheck, context)) return false;
            // If this function takes fewer than the number of inputs that the given function expects,
            // then the given function will not function correctly. But it is okay if the given
            // function takes fewer inputs then this function, since it just means it's ignoring some of the inputs.
            if (this.inputs.length < inputsToCheck.length) return false;
            for (
                let i = 0;
                // Keep going until we run out of inputs from either list.
                i < this.inputs.length && i < inputsToCheck.length;
                i++
            ) {
                const thisBind = this.inputs[i];
                const thatBind = inputsToCheck[i];
                if (
                    thisBind.type instanceof Type &&
                    thatBind.type instanceof Type &&
                    !thisBind.type.accepts(thatBind.type, context)
                )
                    return false;
                if (thisBind.isVariableLength() !== thatBind.isVariableLength())
                    return false;
                if (thisBind.hasDefault() !== thatBind.hasDefault())
                    return false;
            }
            return true;
        });
    }

    /** Create a function that matches the expected type */
    getFunctionPlaceholder(): FunctionDefinition {
        return FunctionDefinition.make(
            undefined,
            new Names([]),
            undefined,
            this.inputs.map((i) =>
                Bind.make(
                    undefined,
                    new Names([Name.make(i.names.names[0].getName())])
                )
            ),
            ExpressionPlaceholder.make(this.output)
        );
    }

    getNativeTypeName(): NativeTypeName {
        return 'function';
    }

    computeConflicts() {
        // Make sure the inputs are valid.
        return getEvaluationInputConflicts(this.inputs);
    }

    getNodeLocale(translation: Locale) {
        return translation.node.FunctionType;
    }

    getGlyphs() {
        return Glyphs.Function;
    }
}
