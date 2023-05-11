import Bind from '@nodes/Bind';
import type Conflict from '@conflicts/Conflict';
import MisplacedInput from '@conflicts/MisplacedInput';
import MissingInput from '@conflicts/MissingInput';
import UnexpectedInput from '@conflicts/UnexpectedInput';
import IncompatibleInput from '@conflicts/IncompatibleInput';
import NotInstantiable from '@conflicts/NotInstantiable';
import NotAFunction from '@conflicts/NotAFunction';
import StructureDefinitionType from './StructureDefinitionType';
import Expression from './Expression';
import Token from './Token';
import Type from './Type';
import type Evaluator from '@runtime/Evaluator';
import type Value from '@runtime/Value';
import Evaluation from '@runtime/Evaluation';
import FunctionValue from '@runtime/FunctionValue';
import type Step from '@runtime/Step';
import Finish from '@runtime/Finish';
import Start from '@runtime/Start';
import StructureDefinitionValue from '@runtime/StructureDefinitionValue';
import type Context from './Context';
import Halt from '@runtime/Halt';
import List from '@runtime/List';
import StructureDefinition from './StructureDefinition';
import FunctionDefinition from './FunctionDefinition';
import TypeInputs from './TypeInputs';
import { getEvaluationInputConflicts } from './util';
import ListType from './ListType';
import type TypeSet from './TypeSet';
import FunctionException from '@runtime/FunctionException';
import ValueException from '@runtime/ValueException';
import Exception from '@runtime/Exception';
import UnknownInput from '@conflicts/UnknownInput';
import getConcreteExpectedType from './Generics';
import FunctionDefinitionType from './FunctionDefinitionType';
import Names from './Names';
import EvalOpenToken from './EvalOpenToken';
import EvalCloseToken from './EvalCloseToken';
import UnclosedDelimiter from '@conflicts/UnclosedDelimiter';
import InvalidTypeInput from '@conflicts/InvalidTypeInput';
import NotAFunctionType from './NotAFunctionType';
import PropertyReference from './PropertyReference';
import NeverType from './NeverType';
import type { Replacement } from './Node';
import type Locale from '@translation/Locale';
import type Node from './Node';
import StartEvaluation from '@runtime/StartEvaluation';
import UnimplementedException from '@runtime/UnimplementedException';
import Reference from './Reference';
import StreamDefinition from './StreamDefinition';
import StreamDefinitionType from './StreamDefinitionType';
import StreamDefinitionValue from '../runtime/StreamDefinitionValue';
import Glyphs from '../lore/Glyphs';

type Mapping = {
    expected: Bind;
    given: undefined | Expression | Expression[];
};

type InputMapping = {
    inputs: Mapping[];
    extra: Expression[];
};

export default class Evaluate extends Expression {
    readonly func: Expression;
    readonly types: TypeInputs | undefined;
    readonly open: Token;
    readonly inputs: Expression[];
    readonly close?: Token;

    constructor(
        func: Expression,
        types: TypeInputs | undefined,
        open: Token,
        inputs: Expression[],
        close?: Token
    ) {
        super();

        this.open = open;
        this.func = func;
        this.types = types;
        this.inputs = inputs;
        this.close = close;

        this.computeChildren();
    }

    static make(func: Expression, inputs: Expression[]) {
        return new Evaluate(
            func,
            undefined,
            new EvalOpenToken(),
            inputs,
            new EvalCloseToken()
        );
    }

    getGrammar() {
        return [
            {
                name: 'func',
                types: [Expression],
                label: (translation: Locale) =>
                    translation.node.Evaluate.function,
            },
            { name: 'types', types: [TypeInputs, undefined] },
            { name: 'open', types: [Token] },
            {
                name: 'inputs',
                types: [[Expression]],
                label: (translation: Locale, child: Node, context: Context) => {
                    // Get the function called
                    const fun = this.getFunction(context);
                    // Didn't find it? Default label.
                    if (fun === undefined || !(child instanceof Expression))
                        return translation.node.Evaluate.input;
                    // Get the mapping from inputs to binds
                    const mapping = this.getInputMapping(fun);
                    // Find the bind to which this child was mapped and get its translation of this language.
                    const bind = mapping.inputs.find(
                        (m) =>
                            m.given !== undefined &&
                            (m.given === child ||
                                (Array.isArray(m.given) &&
                                    m.given.includes(child)))
                    );
                    return bind === undefined
                        ? translation.node.Evaluate.input
                        : bind.expected.names.getLocaleText(
                              translation.language
                          );
                },
                space: true,
                indent: true,
                // The type of an input depends on the function it's calling and the position in the list.
                getType: (
                    context: Context,
                    index: number | undefined
                ): Type => {
                    const fun = this.getFunction(context);
                    if (fun === undefined) return new NeverType();
                    // Undefined list index means empty, so we get the type of the first input.
                    return index !== undefined &&
                        index >= 0 &&
                        index < fun.inputs.length
                        ? fun.inputs[index ?? 0].getType(context)
                        : new NeverType();
                },
                canInsertAt: (context: Context, index: number) => {
                    // We only allow insertions that are 1) required next or 2) optional, and not already provided.
                    const fun = this.getFunction(context);
                    if (fun === undefined) return true;

                    // Get this evaluate's mapping from expected to given inputs.
                    const mapping = this.getInputMapping(fun);

                    // Find the input at this index.
                    const input = mapping.inputs[index];

                    // This position is insertable if its a variable length input or not provided.
                    return (
                        input?.given === undefined ||
                        input?.expected.isVariableLength()
                    );
                },
            },
            { name: 'close', types: [Token] },
        ];
    }

    clone(replace?: Replacement) {
        return new Evaluate(
            this.replaceChild('func', this.func, replace),
            this.replaceChild('types', this.types, replace),
            this.replaceChild('open', this.open, replace),
            this.replaceChild('inputs', this.inputs, replace),
            this.replaceChild('close', this.close, replace)
        ) as this;
    }

    /**
     * Using the given and expected inputs, generates a mapping from expected to given inputs that can be reused during
     * conflict detection, compilation, and autocomplete.
     * */
    getInputMapping(
        fun: FunctionDefinition | StructureDefinition | StreamDefinition
    ): InputMapping {
        // Get the expected inputs, unless there are parsing errors..
        const expectedInputs = fun.inputs;

        // Get the given inputs.
        const givenInputs = this.inputs.slice();

        // Prepare a list of mappings.
        const mappings: InputMapping = {
            inputs: [],
            extra: [],
        };

        // Loop through each of the expected types and see if the given types match.
        for (const expectedInput of expectedInputs) {
            // Prepare a mapping.
            const mapping: Mapping = {
                expected: expectedInput,
                given: undefined,
            };

            if (expectedInput.isRequired()) mapping.given = givenInputs.shift();
            // If it's optional, go through each input to see if it's provided in the remaining inputs.
            else {
                // If it's variable length, check all of the remaining given inputs to see if they match this type.
                if (expectedInput.isVariableLength()) {
                    mapping.given = [];
                    while (givenInputs.length > 0) {
                        const given = givenInputs.shift();
                        if (given) mapping.given.push(given);
                    }
                }
                // If it's just an optional input, see if any of the given inputs provide it by name.
                else {
                    // Is there a named input that matches?
                    const bind = givenInputs.find(
                        (i) => i instanceof Bind && i.sharesName(expectedInput)
                    );
                    if (bind instanceof Bind) {
                        // Remove it from the given inputs list.
                        givenInputs.splice(givenInputs.indexOf(bind), 1);
                        mapping.given = bind;
                    }
                    // If there wasn't a named input matching, see if the next non-bind expression matches the type.
                    else if (
                        givenInputs.length > 0 &&
                        !(givenInputs[0] instanceof Bind)
                    ) {
                        mapping.given = givenInputs.shift();
                    }
                    // Otherwise, there's no given input for this optional input.
                }
            }

            // Add the mapping to the mappings.
            mappings.inputs.push(mapping);
        }

        // Add any extra given inputs to the extra.
        mappings.extra = givenInputs;

        // Return the final mappings. Now we have a complete spec of which expressions were provided for each function input.
        return mappings;
    }

    /**
     *  Given a name and an expression, create a new evaluate that binds this name to this value instead of its current binding,
     * and if there is no current binding, create one.
     */
    withBindAs(
        name: string,
        expression: Expression | undefined,
        context: Context
    ): Evaluate {
        const mapping = this.getMappingFor(name, context);
        if (mapping === undefined) return this;

        // If we'replacing with nothing

        // If it's already bound, replace the binding.
        if (mapping.given instanceof Bind) {
            if (expression === undefined)
                return this.replace(mapping.given, expression);
            else if (mapping.given.value)
                return this.replace(mapping.given.value, expression);
        } else if (mapping.given instanceof Expression) {
            return this.replace(mapping.given, expression);
        }
        // If it's not, then add a binding.
        else if (mapping.given === undefined) {
            return this.replace(this.inputs, [
                ...this.inputs,
                Bind.make(undefined, Names.make([name]), undefined, expression),
            ]);
        }

        // We don't support modifications to the variable length list (yet).
        return this;
    }

    withInputAppended(expression: Expression) {
        return new Evaluate(
            this.func,
            this.types,
            this.open,
            [...this.inputs, expression],
            this.close
        );
    }

    getExpressionFor(name: string, context: Context) {
        const mapping = this.getMappingFor(name, context);
        return mapping === undefined
            ? undefined
            : mapping.given instanceof Bind
            ? mapping.given.value
            : mapping.given;
    }

    getMappingFor(name: string, context: Context) {
        // Find the function being called.
        const fun = this.getFunction(context);
        if (fun === undefined) return undefined;

        // Figure out what the current mapping is.
        const mappings = this.getInputMapping(fun);

        // Find the bind.
        return mappings.inputs.find((input) =>
            input.expected.names.hasName(name)
        );
    }

    computeConflicts(context: Context): Conflict[] {
        const conflicts = [];

        if (this.close === undefined)
            conflicts.push(
                new UnclosedDelimiter(this, this.open, new EvalCloseToken())
            );

        // Get the function this evaluate is trying to... evaluate.
        const fun = this.getFunction(context);

        // The function must be a function or structure. If it's not, that's a conflict.
        // Then stop checking because we can't analyze anything.
        if (
            !(
                fun instanceof FunctionDefinition ||
                fun instanceof StructureDefinition ||
                fun instanceof StreamDefinition
            )
        )
            return [
                new NotAFunction(
                    this,
                    this.func instanceof PropertyReference
                        ? this.func.name
                        : this.func instanceof Reference
                        ? this.func
                        : undefined,
                    this.func instanceof PropertyReference
                        ? this.func.structure.getType(context)
                        : undefined
                ),
            ];

        // If it's a structure definition, can we create it?
        if (fun instanceof StructureDefinition) {
            // Can't create interfaces that don't have missing function definitions.
            const abstractFunctions = fun.getAbstractFunctions();
            if (abstractFunctions.length > 0)
                return [new NotInstantiable(this, fun, abstractFunctions)];
        }

        // We made it! Let's analyze the given and expected inputs and see if there are any problems.
        const expectedInputs = fun.inputs;

        // If the target inputs has conflicts with its names, defaults, or variable length inputs,
        // then we don't analyze this.
        if (getEvaluationInputConflicts(expectedInputs).length > 0) return [];

        // To verify that this evaluation's given inputs match the target inputs,
        // we get the mapping from expected to given, then look for various conflicts in the mapping,
        // one expected input at a time.
        const mapping = this.getInputMapping(fun);

        // Loop through each of the expected types and see if the given types match.
        for (const { expected, given } of mapping.inputs) {
            // If it's required but not given, conflict
            if (expected.isRequired() && given === undefined)
                return [
                    new MissingInput(
                        fun,
                        this,
                        this.close ??
                            this.inputs[this.inputs.length - 1] ??
                            this.open,
                        expected
                    ),
                ];

            // Given a bind with an incompatible name? Conflict.
            if (given instanceof Bind && !expected.sharesName(given))
                return [new MisplacedInput(fun, this, expected, given)];

            // Figure out what type this expected input is. Resolve any type variables to concrete values.
            if (given instanceof Expression) {
                const expectedType = getConcreteExpectedType(
                    fun,
                    expected,
                    this,
                    context
                );
                const givenType = given.getType(context);
                if (!expectedType.accepts(givenType, context, given))
                    conflicts.push(
                        new IncompatibleInput(
                            fun,
                            this,
                            given,
                            givenType,
                            expectedType
                        )
                    );
            }

            // If it's variable length verify that all inputs are an acceptable type.
            if (expected.isVariableLength() && Array.isArray(given)) {
                let isVariableListInput = false;
                // It's okay to provide a compatible list as the input, instead of a sequence of inputs to the evaluate.
                if (given.length === 1) {
                    const lastType = given[0].getType(context);
                    if (
                        lastType instanceof ListType &&
                        expected instanceof ListType &&
                        (lastType.type === undefined ||
                            expected.type?.accepts(lastType.type, context))
                    )
                        isVariableListInput = true;
                }

                // If it's not a list input for a variable length input, check every input to make sure it's valid.
                if (!isVariableListInput) {
                    for (const item of given) {
                        const givenType = item.getType(context);
                        if (
                            expected.type instanceof Type &&
                            !expected.type.accepts(givenType, context)
                        )
                            conflicts.push(
                                new IncompatibleInput(
                                    fun,
                                    this,
                                    item,
                                    givenType,
                                    expected.type
                                )
                            );
                    }
                }
            }
        }

        // See if any of the remaining given inputs are bound to unknown names.
        for (const given of mapping.extra) {
            if (
                given instanceof Bind &&
                !fun.inputs.some((expected) => expected.sharesName(given))
            )
                conflicts.push(new UnknownInput(fun, this, given));
        }

        // If there are remaining given inputs that didn't match anything, something's wrong.
        if (mapping.extra.length > 0)
            for (const extra of mapping.extra)
                conflicts.push(new UnexpectedInput(fun, this, extra));

        // Check type
        if (!(fun instanceof StreamDefinition)) {
            const expected = fun.types;
            // If there are type inputs provided, verify that they exist on the function.
            if (this.types && this.types.types.length > 0) {
                for (let index = 0; index < this.types.types.length; index++) {
                    if (index >= (expected?.variables.length ?? 0)) {
                        conflicts.push(
                            new InvalidTypeInput(
                                this,
                                this.types.types[index],
                                fun
                            )
                        );
                        break;
                    }
                }
            }
        }

        return conflicts;
    }

    getTypeInputs(): TypeInputs | undefined {
        // Find any type inputs provided to this by seeing if there's a Reference on the tail end of the function expression.
        return this.types;
    }

    getFunction(
        context: Context
    ): FunctionDefinition | StructureDefinition | StreamDefinition | undefined {
        const type = this.func.getType(context);

        return type instanceof FunctionDefinitionType
            ? type.fun
            : type instanceof StructureDefinitionType
            ? type.structure
            : type instanceof StreamDefinitionType
            ? type.definition
            : undefined;
    }

    is(def: StructureDefinition, context: Context) {
        return this.getFunction(context) === def;
    }

    isOneOf(context: Context, ...types: StructureDefinition[]) {
        const fun = this.getFunction(context);
        return types.includes(fun as StructureDefinition);
    }

    computeType(context: Context): Type {
        const fun = this.getFunction(context);

        // If it's a function type with an output type, then return the output type.
        if (fun instanceof FunctionDefinition)
            return getConcreteExpectedType(fun, undefined, this, context);
        // If it's a structure, then this is an instantiation of the structure, so this evaluate resolves
        // to a value of the structure's type.
        else if (fun instanceof StructureDefinition)
            return new StructureDefinitionType(fun, [
                ...(this.types ? this.types.types : []),
            ]);
        else if (fun instanceof StreamDefinition) {
            // Remember that this type came from this definition.
            context.setStreamType(fun.output, fun);
            // Return the type of this stream's output.
            return fun.output;
        }
        // Otherwise, who knows.
        else return new NotAFunctionType(this, this.func.getType(context));
    }

    getDependencies(context: Context): Expression[] {
        const fun = this.getFunction(context);
        const expression =
            fun === undefined
                ? undefined
                : fun instanceof FunctionDefinition &&
                  fun.expression !== undefined
                ? fun.expression
                : fun instanceof StructureDefinition
                ? fun.expression
                : undefined;

        // Evaluates depend on their function, their inputs, and the function's expression.
        return [
            this.func,
            ...this.inputs,
            ...(expression === undefined ? [] : [expression]),
        ];
    }

    isConstant() {
        return false;
    }

    compile(context: Context): Step[] {
        // To compile an evaluate, we need to compile all of the given and default values in
        // order of the function's declaration. This requires getting the function/structure definition
        // and finding an expression to compile for each input.
        const fun = this.getFunction(context);

        // Halt if we couldn't find the function.
        if (fun === undefined)
            return [
                new Halt(
                    (evaluator) =>
                        new FunctionException(
                            evaluator,
                            this,
                            undefined,
                            this.func.toWordplay()
                        ),
                    this
                ),
            ];

        // Get the mapping from expected to given.
        const mapping = this.getInputMapping(fun);

        // Iterate through the inputs, compiling given or default expressions.
        const inputSteps = mapping.inputs.map((input) => {
            const { expected, given } = input;

            // If nothing was given...
            if (given === undefined) {
                // Is there a default value?
                return expected.value !== undefined
                    ? // Compile that.
                      expected.value.compile(context)
                    : // Otherwise, halt on an expected value.
                      [
                          new Halt(
                              (evaluator) =>
                                  new ValueException(evaluator, this),
                              this
                          ),
                      ];
            }
            // If something was given...
            else {
                // Is it a variable length value?
                if (Array.isArray(given)) {
                    if (expected.isVariableLength())
                        return given.reduce(
                            (prev: Step[], next) => [
                                ...prev,
                                ...next.compile(context),
                            ],
                            []
                        );
                    // Otherwise, halt on an expected value.
                    else
                        return [
                            new Halt(
                                (evaluator) =>
                                    new ValueException(evaluator, this),
                                this
                            ),
                        ];
                }
                // Otherise, just compile it
                else return given.compile(context);
            }
        });

        // Evaluate the function expression, then the inputs, then evaluate this using the resulting values.
        return [
            new Start(this),
            ...inputSteps.reduce((steps: Step[], s) => [...steps, ...s], []),
            ...this.func.compile(context),
            new StartEvaluation(this),
            new Finish(this),
        ];
    }

    startEvaluation(evaluator: Evaluator) {
        // Get the function off the stack and bail if it's not a function.
        const definitionValue = evaluator.popValue(this);
        if (
            !(
                definitionValue instanceof FunctionValue ||
                definitionValue instanceof StructureDefinitionValue ||
                definitionValue instanceof StreamDefinitionValue
            )
        )
            return new FunctionException(
                evaluator,
                this,
                definitionValue,
                this.func.toWordplay()
            );

        // Pop as many values as the definition requires, or the number of inputs provided, whichever is larger.
        // This accounts for variable length arguments.
        const count = Math.max(
            definitionValue.definition.inputs.length,
            this.inputs.length
        );

        // Get all the values off the stack, getting as many as is defined.
        const values = [];
        for (let i = 0; i < count; i++) {
            const value = evaluator.popValue(this);
            if (value instanceof Exception) return value;
            else values.unshift(value);
        }

        const definition = definitionValue.definition;

        // Build the bindings using the definition's inputs and bail if there's an exception
        const bindings = this.buildBindings(
            evaluator,
            definition.inputs,
            values
        );
        if (bindings instanceof Exception) return bindings;

        // For functions, get the expression, build the bindings, and start an evaluation.
        if (definitionValue instanceof FunctionValue) {
            const body = definitionValue.definition.expression;

            // Bail if the function's body isn't an expression.
            if (body === undefined)
                return new UnimplementedException(
                    evaluator,
                    body ?? definitionValue.definition
                );

            evaluator.startEvaluation(
                new Evaluation(
                    evaluator,
                    this,
                    definition,
                    definitionValue.context,
                    bindings
                )
            );
        }
        // For structures, build the bindings and st
        else if (definitionValue instanceof StructureDefinitionValue) {
            // Evaluate the structure's block with the bindings, generating an evaluation context with the
            // type's inputs and functions.
            evaluator.startEvaluation(
                new Evaluation(
                    evaluator,
                    this,
                    definition,
                    evaluator.getCurrentEvaluation(),
                    bindings
                )
            );
        }
        // For streams, we don't evaluate anything. Instead, we check if this node has already created a
        // stream, and if so, just return it, and if not, create it.
        else if (definitionValue instanceof StreamDefinitionValue) {
            evaluator.startEvaluation(
                new Evaluation(
                    evaluator,
                    this,
                    definition,
                    evaluator.getCurrentEvaluation(),
                    bindings
                )
            );
        }
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        return evaluator.popValue(this);
    }

    buildBindings(
        evaluator: Evaluator,
        inputs: Bind[],
        values: Value[]
    ): Map<Names, Value> | Exception {
        // Build the bindings, backwards because they are in reverse on the stack.
        const bindings = new Map<Names, Value>();
        for (let i = 0; i < inputs.length; i++) {
            const bind = inputs[i];
            if (i >= values.length) return new ValueException(evaluator, this);

            // If it's variable length, take the rest of the values and stop.
            if (bind.isVariableLength()) {
                // If there's only one more value and it's already a list, just set it to the list.
                bindings.set(
                    bind.names,
                    values[i] instanceof List
                        ? values[i]
                        : new List(this, values.slice(i))
                );
                break;
            }
            // Otherwise, just set this value.
            bindings.set(bind.names, values[i]);
        }
        return bindings;
    }

    evaluateTypeSet(
        bind: Bind,
        original: TypeSet,
        current: TypeSet,
        context: Context
    ) {
        if (this.func instanceof Expression)
            this.func.evaluateTypeSet(bind, original, current, context);
        this.inputs.forEach((input) => {
            if (input instanceof Expression)
                input.evaluateTypeSet(bind, original, current, context);
        });
        return current;
    }

    getStart() {
        return this.open;
    }
    getFinish() {
        return this.close ?? this.func;
    }

    getNodeLocale(translation: Locale) {
        return translation.node.Evaluate;
    }

    getStartExplanations(translation: Locale) {
        return translation.node.Evaluate.start(this.inputs.length > 0);
    }

    getFinishExplanations(
        translation: Locale,
        context: Context,
        evaluator: Evaluator
    ) {
        return translation.node.Evaluate.finish(
            this.getValueIfDefined(translation, context, evaluator)
        );
    }

    getGlyphs() {
        return Glyphs.Evaluate;
    }
}
