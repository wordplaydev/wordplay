import { Purpose } from '#concepts/Purpose.ts';
import type Conflict from '#conflicts/Conflict.ts';
import UnexpectedTypeInput from '#conflicts/UnexpectedTypeInput.ts';
import { UnknownName } from '#conflicts/UnknownName.ts';
import { UnknownTypeName } from '#conflicts/UnknownTypeName.ts';
import type {
    InsertContext,
    ReplaceContext,
} from '#edit/revision/EditContext.ts';
import Refer from '#edit/revision/Refer.ts';
import type LocaleText from '#locale/LocaleText.ts';
import type Locales from '#locale/Locales.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import type { BasisTypeName } from '#basis/BasisConstants.ts';
import { Emotion } from '../lore/Emotion';
import type Context from '#nodes/Context.ts';
import type ConversionDefinition from '#nodes/ConversionDefinition.ts';
import type Definition from '#nodes/Definition.ts';
import KitType from '#nodes/KitType.ts';
import NameToken from '#nodes/NameToken.ts';
import type Node from '#nodes/Node.ts';
import { node, optional, type Grammar, type Replacement } from '#nodes/Node.ts';
import StructureDefinition from '#nodes/StructureDefinition.ts';
import StructureType from '#nodes/StructureType.ts';
import { Sym } from '#nodes/Sym.ts';
import { PROPERTY_SYMBOL } from '#parser/Symbols.ts';
import Token from '#nodes/Token.ts';
import Type from '#nodes/Type.ts';
import TypeInputs from '#nodes/TypeInputs.ts';
import type TypeSet from '#nodes/TypeSet.ts';
import TypeVariable from '#nodes/TypeVariable.ts';
import UnknownNameType from '#nodes/UnknownNameType.ts';
import VariableType from '#nodes/VariableType.ts';

export default class NameType extends Type {
    /** The kit this name is reached through, when it is (#1373): the `colors` of
     *  `colors.Sprite`. A structure a kit shares is otherwise only nameable flat, so two
     *  kits sharing a structure name leave one of them un-annotatable. */
    readonly kit: Token | undefined;
    readonly dot: Token | undefined;
    readonly name: Token;
    readonly types: TypeInputs | undefined;
    readonly definition: Definition | undefined;

    constructor(
        type: Token | string,
        types?: TypeInputs,
        definition?: Definition,
        kit?: Token,
        dot?: Token,
    ) {
        super();

        this.kit = kit;
        this.dot =
            dot ??
            (kit === undefined
                ? undefined
                : new Token(PROPERTY_SYMBOL, Sym.Access));
        this.name = typeof type === 'string' ? NameToken(type) : type;
        this.types = types;
        this.definition = definition;

        this.computeChildren();
    }

    static make(name: string, definition?: Definition) {
        return new NameType(NameToken(name), undefined, definition);
    }

    /** A name reached through a kit, e.g. `colors.Sprite`. */
    static qualified(kit: string, name: string, definition?: Definition) {
        return new NameType(
            NameToken(name),
            undefined,
            definition,
            NameToken(kit),
        );
    }

    static getStructuresInScope(node: Node, context: Context) {
        // Suggest all defined structures in scope
        return node
            .getDefinitionsInScope(context)
            .filter((def) => def instanceof StructureDefinition)
            .map((def) => new Refer((name) => NameType.make(name, def), def));
    }

    static getPossibleReplacements({ node, context }: ReplaceContext) {
        // Suggest all defined structures in scope
        return this.getStructuresInScope(node, context);
    }

    static getPossibleInsertions({ parent, context }: InsertContext) {
        return this.getStructuresInScope(parent, context);
    }

    getDescriptor(): NodeDescriptor {
        return 'NameType';
    }

    getPurpose() {
        return Purpose.Types;
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'kit',
                kind: optional(node(Sym.Name)),
                uncompletable: true,
                label: undefined,
            },
            {
                name: 'dot',
                kind: optional(node(Sym.Access)),
                label: undefined,
            },
            {
                name: 'name',
                kind: node(Sym.Name),
                uncompletable: true,
                label: undefined,
            },
            {
                name: 'types',
                kind: optional(node(TypeInputs)),
                label: undefined,
            },
        ];
    }

    clone(replace?: Replacement) {
        return this.cloned(
            new NameType(
                this.replaceChild('name', this.name, replace),
                this.replaceChild('types', this.types, replace),
                undefined,
                this.replaceChild('kit', this.kit, replace),
                this.replaceChild('dot', this.dot, replace),
            ),
        );
    }

    getName() {
        return this.name.getText();
    }

    withName(name: string) {
        return new NameType(NameToken(name), this.types, this.definition);
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
        else if (!(
            def instanceof StructureDefinition || def instanceof TypeVariable
        ))
            conflicts.push(new UnknownTypeName(this, def));
        else if (def instanceof StructureDefinition) {
            // If there are type inputs provided, verify that they exist on the function.
            if (this.types && this.types.types.length > 0) {
                const expected = def.types;
                for (const [index, typeInput] of this.types.types.entries()) {
                    if (index >= (expected?.variables.length ?? 0)) {
                        conflicts.push(
                            new UnexpectedTypeInput(this, typeInput, def),
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
        if (this.definition !== undefined) return this.definition;
        if (context === undefined) return undefined;
        // Reached through a kit (`colors.Sprite`) — resolve the kit, then ask it for the
        // name, so it answers with what the kit *shares* rather than whatever else is in
        // scope under that name (#1373).
        if (this.kit !== undefined) {
            const kit = this.getDefinitionOfNameInScope(
                this.kit.getText(),
                context,
            );
            // A type variable is the one `Definition` with no type of its own, and is
            // never a kit anyway.
            if (kit === undefined || kit instanceof TypeVariable)
                return undefined;
            const type = kit.getType(context);
            return type instanceof KitType
                ? type.getDefinition(this.getName())
                : undefined;
        }
        // Find the name in the binding scope.
        return this.getDefinitionOfNameInScope(this.getName(), context);
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

    /** Conversions live on the structure this name resolves to, so delegate to
     * it — otherwise a name-typed value (e.g. a structure-valued stream's
     * output) would only find generic basis conversions and miss the
     * structure's own (like Moment's localized text conversion). */
    getConversion(
        context: Context,
        input: Type,
        output: Type,
    ): ConversionDefinition | undefined {
        const type = this.getType(context);
        return type instanceof StructureType
            ? type.getConversion(context, input, output)
            : super.getConversion(context, input, output);
    }

    getAllConversions(context: Context): ConversionDefinition[] {
        const type = this.getType(context);
        return type instanceof StructureType
            ? type.getAllConversions(context)
            : super.getAllConversions(context);
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

    getDescriptionInputs(locales: Locales, context: Context) {
        // Describe what the name resolves to, not the text as written, so a
        // basis type written in another language is spoken in the reader's.
        const def = this.resolve(context);
        return {
            name:
                def === undefined
                    ? this.name.getText()
                    : locales.getDescriptiveName(def.names),
        };
    }

    getDefaultExpression(context: Context) {
        const type = this.resolve(context);
        if (type instanceof StructureDefinition)
            return type.getType(context).getDefaultExpression(context);
        return undefined;
    }
}
