import type Conflict from '@conflicts/Conflict';
import IncompatibleInput from '@conflicts/IncompatibleInput';
import MissingInput from '@conflicts/MissingInput';
import NotInstantiable from '@conflicts/NotInstantiable';
import SeparatedEvaluate from '@conflicts/SeparatedEvaluate';
import UnclosedDelimiter from '@conflicts/UnclosedDelimiter';
import UnexpectedInput from '@conflicts/UnexpectedInput';
import UnexpectedTypeInput from '@conflicts/UnexpectedTypeInput';
import UnknownInput from '@conflicts/UnknownInput';
import type EditContext from '@edit/EditContext';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import Bind from '@nodes/Bind';
import Evaluation from '@runtime/Evaluation';
import type Evaluator from '@runtime/Evaluator';
import Finish from '@runtime/Finish';
import Halt from '@runtime/Halt';
import Start from '@runtime/Start';
import StartEvaluation from '@runtime/StartEvaluation';
import type Step from '@runtime/Step';
import ExceptionValue from '@values/ExceptionValue';
import FunctionException from '@values/FunctionException';
import FunctionValue from '@values/FunctionValue';
import ListValue from '@values/ListValue';
import StructureDefinitionValue from '@values/StructureDefinitionValue';
import UnimplementedException from '@values/UnimplementedException';
import type Value from '@values/Value';
import ValueException from '@values/ValueException';
import Purpose from '../concepts/Purpose';
import Refer from '../edit/Refer';
import type Locales from '../locale/Locales';
import Characters from '../lore/BasisCharacters';
import StreamDefinitionValue from '../values/StreamDefinitionValue';
import TypeException from '../values/TypeException';
import AnyType from './AnyType';
import BasisType from './BasisType';
import Block from './Block';
import type Context from './Context';
import EvalCloseToken from './EvalCloseToken';
import EvalOpenToken from './EvalOpenToken';
import Expression, { ExpressionKind, type GuardContext } from './Expression';
import FunctionDefinition from './FunctionDefinition';
import FunctionType from './FunctionType';
import getConcreteExpectedType from './Generics';
import Input from './Input';
import ListType from './ListType';
import Names from './Names';
import NameType from './NameType';
import NeverType from './NeverType';
import type Node from './Node';
import { any, list, node, none, type Grammar, type Replacement } from './Node';
import NoExpressionType from './NoExpressionType';
import { NonFunctionType } from './NonFunctionType';
import PropertyReference from './PropertyReference';
import Reference from './Reference';
import StreamDefinition from './StreamDefinition';
import StreamDefinitionType from './StreamDefinitionType';
import StructureDefinition from './StructureDefinition';
import StructureDefinitionType from './StructureDefinitionType';
import StructureType from './StructureType';
import Sym from './Sym';
import type Token from './Token';
import type Type from './Type';
import TypeInputs from './TypeInputs';
import type TypeSet from './TypeSet';
import TypeVariable from './TypeVariable';
import UnionType from './UnionType';
import { getEvaluationInputConflicts } from './util';

type Mapping = {
    expected: Bind;
    given: undefined | Expression | Expression[] | Input;
};

type InputMapping = { inputs: Mapping[]; extra: (Expression | Input)[] };

export default class Evaluate extends Expression {
    readonly fun: Expression;
    readonly types: TypeInputs | undefined;
    readonly open: Token;
    readonly inputs: (Expression | Input)[];
    readonly close: Token | undefined;

    constructor(
        func: Expression,
        types: TypeInputs | undefined,
        open: Token,
        inputs: (Expression | Input)[],
        close?: Token,
    ) {
        super();

        this.open = open;
        this.fun = func;
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
            new EvalCloseToken(),
        );
    }

    static getPossibleEvaluations(
        expectedType: Type | undefined,
        node: Node,
        replace: boolean,
        context: Context,
    ) {
        const nodeBeingReplaced = replace ? node : undefined;

        // Given the node the caret has selected or is after, find out
        // if there's an evaluate on it that we should complete.
        const scopingType =
            nodeBeingReplaced instanceof Expression
                ? nodeBeingReplaced.getType(context)
                : undefined;
        const structure =
            scopingType instanceof BasisType ||
            scopingType instanceof StructureType;
        // Get the definitions in the structure type we found,
        // or in the surrounding scope if there isn't one.
        const definitions =
            // If the anchor is selected for replacement...
            nodeBeingReplaced
                ? // If the scope is basis, get definitions in basis scope
                  scopingType instanceof BasisType
                    ? scopingType.getDefinitions(nodeBeingReplaced, context)
                    : // If the scope is a structure, get definitions in its scope
                      scopingType instanceof StructureType
                      ? scopingType.definition.getDefinitions(nodeBeingReplaced)
                      : // Otherwise, get definitions in scope of the anchor
                        node.getDefinitionsInScope(context)
                : // If the node is not selected, get definitions in the anchor's scope
                  node.getDefinitionsInScope(context);

        // This probably doesn't belong here. The expected type is the expected type, and it should be correct.
        // if (!isBeingReplaced && structure) expectedType = undefined;

        // Convert the definitions to evaluate suggestions.
        return definitions
            .filter(
                (
                    def,
                ): def is
                    | FunctionDefinition
                    | StructureDefinition
                    | StreamDefinition =>
                    (def instanceof FunctionDefinition &&
                        (expectedType === undefined ||
                            expectedType.accepts(
                                def.getOutputType(context),
                                context,
                            ))) ||
                    (def instanceof StructureDefinition &&
                        !def.isInterface() &&
                        (expectedType === undefined ||
                            expectedType.accepts(
                                def.getType(context),
                                context,
                            ))) ||
                    (def instanceof StreamDefinition &&
                        (expectedType === undefined ||
                            expectedType.accepts(
                                def.getType(context),
                                context,
                            ))),
            )
            .map(
                (def) =>
                    new Refer(
                        (name) =>
                            def.getEvaluateTemplate(
                                name,
                                context,
                                replace &&
                                    structure &&
                                    nodeBeingReplaced instanceof Expression
                                    ? nodeBeingReplaced
                                    : undefined,
                            ),
                        def,
                    ),
            );
    }

    static getPossibleReplacements({ node, type, context }: EditContext) {
        return this.getPossibleEvaluations(type, node, true, context);
    }

    static getPossibleAppends({ node, type, context }: EditContext) {
        return this.getPossibleEvaluations(type, node, false, context);
    }

    getDescriptor(): NodeDescriptor {
        return 'Evaluate';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'fun',
                kind: node(Expression),
                getType: (context) =>
                    FunctionType.make(
                        undefined,
                        this.inputs.map((input) =>
                            Bind.make(
                                undefined,
                                Names.make(['_']),
                                input.getType(context),
                            ),
                        ),
                        new AnyType(),
                    ),
                label: () => (l) => l.node.Evaluate.function,
            },
            { name: 'types', kind: any(node(TypeInputs), none()) },
            { name: 'open', kind: node(Sym.EvalOpen) },
            {
                name: 'inputs',
                kind: list(true, node(Input), node(Expression)),
                label: (locales: Locales, child: Node, context: Context) => {
                    // Get the function called
                    const fun = this.getFunction(context);
                    // Didn't find it? Default label.
                    if (fun === undefined || !(child instanceof Expression))
                        return (l) => l.node.Evaluate.input;
                    // Get the mapping from inputs to binds
                    const mapping = this.getInputMapping(context);
                    // Find the bind to which this child was mapped and get its translation of this language.
                    const bind = mapping?.inputs.find(
                        (m) =>
                            m.given !== undefined &&
                            (m.given === child ||
                                (Array.isArray(m.given) &&
                                    m.given.includes(child))),
                    );
                    return bind === undefined
                        ? (l) => l.node.Evaluate.input
                        : () => locales.getName(bind.expected.names);
                },
                space: true,
                indent: true,
                // The type of an input depends on the function it's calling and the position in the list.
                getType: (
                    context: Context,
                    index: number | undefined,
                ): Type => {
                    const fun = this.getFunction(context);
                    if (fun === undefined) return new NeverType();
                    // Determine the type of the next input
                    const insertionIndex = Math.min(
                        Math.max(0, index ?? 0),
                        fun.inputs.length - 1,
                    );
                    return fun.inputs[insertionIndex].getType(context);
                },
            },
            { name: 'close', kind: node(Sym.EvalClose) },
        ];
    }

    getPurpose() {
        return Purpose.Evaluate;
    }

    clone(replace?: Replacement) {
        return new Evaluate(
            this.replaceChild('fun', this.fun, replace),
            this.replaceChild('types', this.types, replace),
            this.replaceChild('open', this.open, replace),
            this.replaceChild('inputs', this.inputs, replace),
            this.replaceChild('close', this.close, replace),
        ) as this;
    }

    /**
     * Using the given and expected inputs, generates a mapping from expected to given inputs that can be reused during
     * conflict detection, compilation, and autocomplete.
     * */
    getInputMapping(context: Context): InputMapping | undefined {
        const fun = this.getFunction(context);
        if (fun === undefined) return undefined;

        // Get the expected inputs, unless there are parsing errors..
        const expectedInputs = fun.inputs;

        // Get the given inputs.
        const givenInputs = this.inputs.slice();

        // Prepare a list of mappings.
        const mappings: InputMapping = { inputs: [], extra: [] };

        // Loop through each of the expected types and see if the given types match.
        for (const expectedInput of expectedInputs) {
            // Prepare a mapping.
            const mapping: Mapping = {
                expected: expectedInput,
                given: undefined,
            };

            if (expectedInput.isRequired()) {
                mapping.given = givenInputs.shift();
            }
            // If it's optional, go through each input to see if it's provided in the remaining inputs.
            else {
                // If it's variable length, check all of the remaining given inputs to see if they match this type.
                if (expectedInput.isVariableLength()) {
                    mapping.given = [];
                    while (givenInputs.length > 0) {
                        const given = givenInputs.shift();
                        if (given)
                            mapping.given.push(
                                given instanceof Input ? given.value : given,
                            );
                    }
                }
                // If it's just an optional input, see if any of the given inputs provide it by name.
                else {
                    // Is there a named input that matches?
                    const bind = givenInputs.find(
                        (i) =>
                            i instanceof Input &&
                            expectedInput.hasName(i.getName()),
                    );
                    if (bind instanceof Input) {
                        // Remove it from the given inputs list.
                        givenInputs.splice(givenInputs.indexOf(bind), 1);
                        mapping.given = bind;
                    }
                    // If there wasn't a named input matching, see if the next non-input expression matches the type.
                    else if (
                        givenInputs.length > 0 &&
                        !(givenInputs[0] instanceof Input)
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

    getInput(
        bind: Bind,
        context: Context,
    ): Expression | Expression[] | undefined {
        const mapping = this.getInputMapping(context);
        const given = mapping?.inputs.find(
            (input) => input.expected === bind,
        )?.given;
        return given instanceof Input ? given.value : given;
    }

    getLastInput(): Expression | Input | undefined {
        return this.inputs[this.inputs.length - 1];
    }

    /**
     * Given a bind of the function being evaluated and an expression, create a new evaluate that binds this name to this value instead of its current binding,
     * and if there is no current binding, create one.
     */
    withBindAs(
        bind: Bind,
        expression: Expression | undefined,
        context: Context,
        named = true,
    ): Evaluate {
        const mapping = this.getMappingFor(bind, context);
        if (mapping === undefined) return this;

        // If it's already bound, replace the binding.
        if (mapping.given instanceof Input) {
            if (expression === undefined)
                return this.replace(mapping.given, expression);
            else if (mapping.given.value)
                return this.replace(mapping.given.value, expression);
        } else if (mapping.given instanceof Expression) {
            return this.replace(mapping.given, expression);
        }
        // If it's not, then add a binding, optionally named
        else if (mapping.given === undefined && expression !== undefined) {
            return this.replace(this.inputs, [
                ...this.inputs,
                named ? Input.make(bind.getNames()[0], expression) : expression,
            ]);
        }

        // We don't support modifications to the variable length list (yet).
        return this;
    }

    withInputAppended(expression: Expression) {
        return new Evaluate(
            this.fun,
            this.types,
            this.open,
            [...this.inputs, expression],
            this.close,
        );
    }

    getInputDefinition(input: Expression, context: Context): Bind | undefined {
        return this.getInputMapping(context)?.inputs.find(
            (map) => map.given === input,
        )?.expected;
    }

    getMappingFor(bind: Bind, context: Context) {
        // Figure out what the current mapping is.
        const mappings = this.getInputMapping(context);

        // Find the bind.
        return mappings?.inputs.find((input) => input.expected === bind);
    }

    computeConflicts(context: Context): Conflict[] {
        const conflicts: Conflict[] = [];

        if (this.close === undefined)
            conflicts.push(
                new UnclosedDelimiter(this, this.open, new EvalCloseToken()),
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
        ) {
            return [
                new IncompatibleInput(
                    this.fun instanceof PropertyReference
                        ? (this.fun.name ?? this.fun)
                        : this.fun,
                    this.fun instanceof PropertyReference
                        ? this.fun.structure.getType(context)
                        : this.fun.getType(context),
                    FunctionType.make(undefined, [], new AnyType()),
                ),
            ];
        }

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
        const mapping = this.getInputMapping(context);

        if (mapping) {
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
                            expected,
                        ),
                    ];

                // Given a named with an incompatible name? Conflict.
                if (
                    given instanceof Input &&
                    !expected.hasName(given.getName())
                )
                    return [
                        new UnexpectedInput(
                            fun,
                            this,
                            given instanceof Input ? given.value : given,
                        ),
                    ];

                // Concretize the expected type.
                const expectedType = getConcreteExpectedType(
                    fun,
                    expected,
                    this,
                    context,
                );

                // Figure out what type this expected input is. Resolve any type variables to concrete values.
                if (given instanceof Expression) {
                    // Don't rely on the bind's specified type, since it's not a reliable source of type information. Ask it's value directly.
                    const givenType =
                        given instanceof Input
                            ? (given.value?.getType(context) ??
                              new NoExpressionType(given))
                            : given.getType(context);
                    if (!expectedType.accepts(givenType, context, given))
                        conflicts.push(
                            new IncompatibleInput(
                                given,
                                givenType,
                                expectedType,
                            ),
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
                            expectedType instanceof ListType &&
                            (lastType.type === undefined ||
                                expectedType.accepts(lastType.type, context))
                        )
                            isVariableListInput = true;
                    }

                    // If it's not a list input for a variable length input, check every input to make sure it's valid.
                    if (!isVariableListInput) {
                        for (const item of given) {
                            const givenType = item.getType(context);
                            if (
                                expectedType instanceof ListType &&
                                expectedType.type &&
                                !expectedType.type.accepts(givenType, context)
                            )
                                conflicts.push(
                                    new IncompatibleInput(
                                        item,
                                        givenType,
                                        expectedType.type,
                                    ),
                                );
                        }
                    }
                }
            }

            // See if any of the remaining given inputs are bound to unknown names.
            for (const given of mapping.extra) {
                if (
                    given instanceof Input &&
                    !fun.inputs.some((expected) =>
                        expected.hasName(given.getName()),
                    )
                ) {
                    conflicts.push(new UnknownInput(fun, this, given));
                } else conflicts.push(new UnexpectedInput(fun, this, given));
            }

            // Check type
            if (!(fun instanceof StreamDefinition)) {
                const expected = fun.types;
                // If there are type inputs provided, verify that they exist on the function.
                if (this.types && this.types.types.length > 0) {
                    for (
                        let index = 0;
                        index < this.types.types.length;
                        index++
                    ) {
                        if (index >= (expected?.variables.length ?? 0)) {
                            conflicts.push(
                                new UnexpectedTypeInput(
                                    this,
                                    this.types.types[index],
                                    fun,
                                ),
                            );
                            break;
                        }
                    }
                }
            }
        }

        // If there are two consectutive IncompatibleInput conflicts, and the first is a StructureDefinitionType and the next is a block,
        // offer to remove the space separating them.

        const possibleEvaluates: [
            Reference,
            boolean,
            Block,
            Conflict,
            Conflict,
        ][] = [];
        conflicts.find((conflict, index, conflicts) => {
            const next = conflicts[index + 1];
            if (
                conflict instanceof IncompatibleInput &&
                (conflict.givenType instanceof StructureDefinitionType ||
                    conflict.givenType instanceof FunctionType) &&
                next instanceof IncompatibleInput &&
                next.givenNode instanceof Block
            ) {
                const ref = conflict.givenNode
                    .nodes()
                    .findLast((n): n is Reference => n instanceof Reference);
                if (ref instanceof Reference)
                    possibleEvaluates.push([
                        ref,
                        conflict.givenType instanceof StructureDefinitionType,
                        next.givenNode,
                        conflict,
                        next,
                    ]);
            }
        });

        for (const [
            ref,
            structure,
            block,
            first,
            second,
        ] of possibleEvaluates) {
            // Remove the two conflicts from the list.
            conflicts.splice(conflicts.indexOf(first), 1);
            conflicts.splice(conflicts.indexOf(second), 1);
            // Add a new one.
            conflicts.push(new SeparatedEvaluate(ref, block, structure));
        }

        return conflicts;
    }

    getTypeInputs(): TypeInputs | undefined {
        // Find any type inputs provided to this by seeing if there's a Reference on the tail end of the function expression.
        return this.types;
    }

    getFunction(
        context: Context,
    ): FunctionDefinition | StructureDefinition | StreamDefinition | undefined {
        const type = this.fun.getType(context);

        return type instanceof FunctionType && type.definition
            ? type.definition
            : type instanceof StructureDefinitionType
              ? type.type.definition
              : type instanceof StreamDefinitionType
                ? type.definition
                : undefined;
    }

    is(def: StructureDefinition | StreamDefinition, context: Context) {
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
        else if (fun instanceof StructureDefinition) {
            // Make a concrete structure definition based on the input types, rather than using the declared types,
            // to reduce the need to declare types on the definition.
            const mapping = this.getInputMapping(context);
            const refinements = fun.inputs.map((bind) => {
                if (mapping) {
                    const map = mapping.inputs.find(
                        (input) => input.expected === bind,
                    );
                    if (map) {
                        if (map.given instanceof Expression)
                            return bind.withType(
                                map.given.getType(context).generalize(context),
                            );
                        else if (Array.isArray(map.given))
                            return bind.withType(
                                ListType.make(
                                    UnionType.getPossibleUnion(
                                        context,
                                        map.given.map((e) =>
                                            e.getType(context),
                                        ),
                                    ),
                                ).generalize(context),
                            );
                    }
                }
                return bind;
            });

            return new StructureType(
                fun,
                [...(this.types ? this.types.types : [])],
                refinements,
            );
        } else if (fun instanceof StreamDefinition) {
            // Remember that this type came from this definition.
            context.setStreamType(fun.output, fun);
            // Return the type of this stream's output.
            return fun.output;
        }
        // Otherwise, who knows.
        else return new NonFunctionType(this.fun, this.fun.getType(context));
    }

    getDependencies(context: Context): Expression[] {
        const fun = this.getFunction(context);
        const expression = fun?.expression;

        // Evaluates depend on their function, their inputs, and the function's expression.
        return [
            this.fun,
            ...this.inputs.map((input) =>
                input instanceof Input ? input.value : input,
            ),
            ...(expression === undefined ? [] : [expression]),
        ];
    }

    isConstant() {
        return false;
    }

    compile(evaluator: Evaluator, context: Context): Step[] {
        // To compile an evaluate, we need to compile all of the given and default values in
        // order of the function's declaration. This requires getting the function/structure definition
        // and finding an expression to compile for each input.
        const fun = this.getFunction(context);

        // Get the mapping from expected to given.
        const mapping = this.getInputMapping(context);

        // Halt if we couldn't find the function.
        if (fun === undefined || mapping === undefined)
            return [
                new Halt(
                    (evaluator) =>
                        new FunctionException(
                            evaluator,
                            this,
                            undefined,
                            this.fun,
                        ),
                    this,
                ),
            ];

        // Iterate through the inputs, compiling given or default expressions.
        const inputSteps = mapping.inputs.map((input) => {
            const { expected, given } = input;

            // If nothing was given...
            if (given === undefined) {
                // Is there a default value?
                return expected.value !== undefined
                    ? // Compile that.
                      expected.value.compile(evaluator, context)
                    : // Otherwise, halt, since a value was expected but not given.
                      [
                          new Halt(
                              (evaluator) =>
                                  new ValueException(evaluator, this),
                              this,
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
                                ...next.compile(evaluator, context),
                            ],
                            [],
                        );
                    // Otherwise, halt on an expected value.
                    else
                        return [
                            new Halt(
                                (evaluator) =>
                                    new ValueException(evaluator, this),
                                this,
                            ),
                        ];
                }
                // Otherise, check its type, and either halt or evaluate.
                else {
                    const expectedType = expected.getType(context);
                    const acceptable =
                        expectedType
                            .nodes()
                            .some(
                                (node) =>
                                    node instanceof NameType &&
                                    node.resolve(context) instanceof
                                        TypeVariable,
                            ) ||
                        expectedType.accepts(given.getType(context), context);

                    return [
                        ...(given instanceof Input
                            ? given.value
                            : given
                        ).compile(evaluator, context),
                        // Evaluate, but if the type was not acceptable, halt
                        ...(acceptable
                            ? []
                            : [
                                  new Halt(
                                      (evaluator) =>
                                          new TypeException(
                                              this,
                                              evaluator,
                                              expectedType,
                                              evaluator.popValue(this),
                                          ),
                                      this,
                                  ),
                              ]),
                    ];
                }
            }
        });

        // Evaluate the function expression, then the inputs, then evaluate this using the resulting values.
        return [
            new Start(this),
            ...inputSteps.reduce((steps: Step[], s) => [...steps, ...s], []),
            ...this.fun.compile(evaluator, context),
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
                this.fun,
            );

        // Pop as many values as the definition requires, or the number of inputs provided, whichever is larger.
        // This accounts for variable length arguments.
        const count = Math.max(
            definitionValue.definition.inputs.length,
            this.inputs.length,
        );

        // Get all the values off the stack, getting as many as is defined.
        const values = [];
        for (let i = 0; i < count; i++) {
            const value = evaluator.popValue(this);
            if (value instanceof ExceptionValue) return value;
            else values.unshift(value);
        }

        const definition = definitionValue.definition;

        // Build the bindings using the definition's inputs and bail if there's an exception
        const bindings = buildBindings(
            evaluator,
            definition.inputs,
            values,
            this,
        );
        if (bindings instanceof ExceptionValue) return bindings;

        // For functions, get the expression, build the bindings, and start an evaluation.
        if (definitionValue instanceof FunctionValue) {
            const body = definitionValue.definition.expression;

            // Bail if the function's body isn't an expression.
            if (body === undefined)
                return new UnimplementedException(
                    evaluator,
                    body ?? definitionValue.definition,
                );

            evaluator.startEvaluation(
                new Evaluation(
                    evaluator,
                    this,
                    definition,
                    definitionValue.context,
                    bindings,
                ),
            );
        }
        // For structures, start evaluating its definition.
        else if (definitionValue instanceof StructureDefinitionValue) {
            // Evaluate the structure's block with the bindings, generating an evaluation context with the
            // type's inputs and functions.
            evaluator.startEvaluation(
                new Evaluation(
                    evaluator,
                    this,
                    definition,
                    evaluator.getCurrentEvaluation(),
                    bindings,
                ),
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
                    bindings,
                ),
            );
        }
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        return evaluator.popValue(this);
    }

    evaluateTypeGuards(current: TypeSet, guard: GuardContext) {
        if (this.fun instanceof Expression)
            this.fun.evaluateTypeGuards(current, guard);
        this.inputs.forEach((input) => {
            if (input instanceof Expression)
                input.evaluateTypeGuards(current, guard);
        });
        return current;
    }

    getStart() {
        return this.open;
    }

    getFinish() {
        return this.close ?? this.fun;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.Evaluate;
    getLocalePath() {
        return Evaluate.LocalePath;
    }

    getStartExplanations(locales: Locales) {
        return locales.concretize(
            (l) => l.node.Evaluate.start,
            this.inputs.length > 0,
        );
    }

    getFinishExplanations(
        locales: Locales,
        context: Context,
        evaluator: Evaluator,
    ) {
        return locales.concretize(
            (l) => l.node.Evaluate.finish,
            this.getValueIfDefined(locales, context, evaluator),
        );
    }

    getDescriptionInputs(locales: Locales, context: Context) {
        const names = this.getFunction(context)?.names;
        return [names ? locales.getName(names) : undefined];
    }

    getCharacter() {
        return Characters.Evaluate;
    }

    getKind() {
        return ExpressionKind.Evaluate;
    }
}

export function buildBindings(
    evaluator: Evaluator,
    inputs: Bind[],
    values: Value[],
    creator: Expression,
): Map<Names, Value> | ExceptionValue {
    // Build the bindings, backwards because they are in reverse on the stack.
    const bindings = new Map<Names, Value>();
    for (let i = 0; i < inputs.length; i++) {
        const bind = inputs[i];

        // Are we missing an input? Throw an excpected value exception.
        if (i >= values.length) return new ValueException(evaluator, creator);

        // If it's variable length, take the rest of the values and stop.
        if (bind.isVariableLength()) {
            // If there's only one more value and it's already a list, just set it to the list.
            bindings.set(
                bind.names,
                values[i] instanceof ListValue
                    ? values[i]
                    : new ListValue(creator, values.slice(i)),
            );
            break;
        }
        // Otherwise, just set this value.
        bindings.set(bind.names, values[i]);
    }
    return bindings;
}
