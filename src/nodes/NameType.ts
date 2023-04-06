import type Conflict from '@conflicts/Conflict';
import { UnknownTypeName } from '@conflicts/InvalidTypeName';
import Token from './Token';
import Type from './Type';
import TypeVariable from './TypeVariable';
import type Context from './Context';
import type Definition from './Definition';
import StructureDefinition from './StructureDefinition';
import VariableType from './VariableType';
import NameToken from './NameToken';
import TypeInputs from './TypeInputs';
import InvalidTypeInput from '@conflicts/InvalidTypeInput';
import type TypeSet from './TypeSet';
import type { NativeTypeName } from '../native/NativeConstants';
import UnknownNameType from './UnknownNameType';
import type Node from './Node';
import type { Replacement } from './Node';
import type Translation from '@translation/Translation';
import { UnknownName } from '@conflicts/UnknownName';
import Emotion from '../lore/Emotion';

export default class NameType extends Type {
    readonly name: Token;
    readonly types: TypeInputs | undefined;
    readonly definition: Definition | undefined;

    constructor(
        type: Token | string,
        types?: TypeInputs,
        definition?: Definition
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

    getGrammar() {
        return [
            { name: 'name', types: [Token] },
            { name: 'types', types: [TypeInputs, undefined] },
        ];
    }

    clone(replace?: Replacement) {
        return new NameType(
            this.replaceChild('name', this.name, replace),
            this.replaceChild('types', this.types, replace)
        ) as this;
    }

    getName() {
        return this.name.getText();
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
        if (def === undefined)
            conflicts.push(new UnknownName(this.name, undefined));
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
                            new InvalidTypeInput(
                                this,
                                this.types.types[index],
                                def
                            )
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

    resolve(context?: Context): Definition | undefined {
        // Find the name in the binding scope.
        return (
            this.definition ??
            (context === undefined
                ? undefined
                : this.getDefinitionOfNameInScope(this.getName(), context))
        );
    }

    isTypeVariable(context: Context) {
        return this.resolve(context) instanceof TypeVariable;
    }

    getType(context: Context): Type {
        // The name should be defined.
        const definition = this.resolve(context);
        if (definition === undefined)
            return new UnknownNameType(this, this.name, undefined);
        else if (definition instanceof TypeVariable)
            return new VariableType(definition);
        else return definition.getType(context);
    }

    getNativeTypeName(): NativeTypeName {
        return 'name';
    }

    getNodeTranslation(translation: Translation) {
        return translation.node.NameType;
    }

    getGlyphs() {
        return {
            symbols: this.name.getText(),
            emotion: Emotion.Kind,
        };
    }
}
