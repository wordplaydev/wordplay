import type Conflict from '@conflicts/Conflict';
import UnexpectedTypeInput from '@conflicts/UnexpectedTypeInput';
import { UnknownName } from '@conflicts/UnknownName';
import { UnknownTypeName } from '@conflicts/UnknownTypeName';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import type { BasisTypeName } from '../basis/BasisConstants';
import Emotion from '../lore/Emotion';
import type Context from './Context';
import type Definition from './Definition';
import NameToken from './NameToken';
import type Node from './Node';
import { node, optional, type Grammar, type Replacement } from './Node';
import StructureDefinition from './StructureDefinition';
import StructureType from './StructureType';
import Sym from './Sym';
import type Token from './Token';
import Type from './Type';
import TypeInputs from './TypeInputs';
import type TypeSet from './TypeSet';
import TypeVariable from './TypeVariable';
import UnknownNameType from './UnknownNameType';
import VariableType from './VariableType';

export default class NameType extends Type {
    readonly name: Token;
    readonly types: TypeInputs | undefined;
    readonly definition: Definition | undefined;

    constructor(
        type: Token | string,
        types?: TypeInputs,
        definition?: Definition,
    ) {
        super();

        this.name = typeof type === 'string' ? new NameToken(type) : type;
        this.types = types;
        this.definition = definition;

        this.computeChildren();
    }

    static make(name: string, definition?: Definition) {
        return new NameType(new NameToken(name), undefined, definition);
    }

    getDescriptor(): NodeDescriptor {
        return 'NameType';
    }

    getGrammar(): Grammar {
        return [
            { name: 'name', kind: node(Sym.Name), uncompletable: true },
            { name: 'types', kind: optional(node(TypeInputs)) },
        ];
    }

    clone(replace?: Replacement) {
        return new NameType(
            this.replaceChild('name', this.name, replace),
            this.replaceChild('types', this.types, replace),
        ) as this;
    }

    getName() {
        return this.name.getText();
    }

    withName(name: string) {
        return new NameType(new NameToken(name), this.types, this.definition);
    }

    getDefinitions(node: Node, context: Context) {
        // Get the definitions in the type this name refers to.
        const def = this.resolve(context);
        return def
            ? def.getDefinitions(node, context)
            : super.getDefinitions(node, context);
    }

    /**
     * Return the Definition that this node corresponds to. By default, nothing,
     * but subclasses can override to resolve the definition they correspond to.
     */
    getCorrespondingDefinition(context: Context): Definition | undefined {
        return this.resolve(context);
    }

    computeConflicts(context: Context): Conflict[] {
        const conflicts = [];

        const def = this.resolve(context);
        // The name should be a structure type or a type variable on a structure that contains this name type.
        if (def === undefined) conflicts.push(new UnknownName(this, undefined));
        else if (
            !(def instanceof StructureDefinition || def instanceof TypeVariable)
        )
            conflicts.push(new UnknownTypeName(this, def));
        else if (def instanceof StructureDefinition) {
            // If there are type inputs provided, verify that they exist on the function.
            if (this.types && this.types.types.length > 0) {
                const expected = def.types;
                for (let index = 0; index < this.types.types.length; index++) {
                    if (index >= (expected?.variables.length ?? 0)) {
                        conflicts.push(
                            new UnexpectedTypeInput(
                                this,
                                this.types.types[index],
                                def,
                            ),
                        );
                        break;
                    }
                }
            }
        }

        return conflicts;
    }

    acceptsAll(types: TypeSet, context: Context): boolean {
        const thisType = this.getType(context);
        if (thisType === undefined) return false;
        return types.list().every((type) => thisType.accepts(type, context));
    }

    getPossibleTypes(context: Context): Type[] {
        return [this.getType(context)];
    }

    concretize(context: Context): Type {
        const concrete = this.getType(context);
        // If it's a structure type, return it, otherwise leave it as a type variable.
        return concrete instanceof StructureType ? concrete : this;
    }

    resolve(context?: Context): Definition | undefined {
        // Find the name in the binding scope.
        return (
            this.definition ??
            (context === undefined
                ? undefined
                : this.getDefinitionOfNameInScope(this.getName(), context))
        );
    }

    /**
     * Override get scope to skip over all types, so we don't end up with funky infinite loops with
     * other types that might try to resolve NameType. None of the types that might
     * contain this can make definitions anyway.
     */
    getScope(context: Context): Node | undefined {
        return context
            .getRoot(this)
            ?.getAncestors(this)
            .find((node) => !(node instanceof Type));
    }

    isTypeVariable(context: Context) {
        return this.resolve(context) instanceof TypeVariable;
    }

    getType(context: Context): Type {
        const definition = this.resolve(context);
        // Not defined? That's an unknown type.
        if (definition === undefined)
            return new UnknownNameType(this, this.name, undefined);
        // Type variable? If it has a constraint, return that type. Otherwise return a variable type.
        else if (definition instanceof TypeVariable) {
            if (definition.type) return definition.type;
            else {
                return new VariableType(definition);
            }
        } else if (definition instanceof StructureDefinition)
            return new StructureType(definition, this.types?.types ?? []);
        // Some other type? Get the definition's type.
        else return definition.getType(context);
    }

    getBasisTypeName(): BasisTypeName {
        return 'name';
    }

    static readonly LocalePath = (l: LocaleText) => l.node.NameType;
    getLocalePath() {
        return NameType.LocalePath;
    }

    getCharacter() {
        return { symbols: this.name.getText(), emotion: Emotion.kind };
    }

    getDescriptionInputs() {
        return [this.name.getText()];
    }

    getDefaultExpression(context: Context) {
        const type = this.resolve(context);
        if (type instanceof StructureDefinition)
            return type.getType(context).getDefaultExpression(context);
        return undefined;
    }
}
