import type Conflict from '#conflicts/Conflict.ts';
import UnrecognizedPatternProperty from '#conflicts/UnrecognizedPatternProperty.ts';
import type LocaleText from '#locale/LocaleText.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import { node, optional, type Grammar, type Replacement } from '#nodes/Node.ts';
import PatternNode from '#nodes/PatternNode.ts';
import { Sym } from '#nodes/Sym.ts';
import type Token from '#nodes/Token.ts';
import { isKnownProperty } from '#runtime/pattern/properties.ts';

/**
 * A Unicode-property qualifier on a class atom, e.g., the `/greek` in `_/greek`
 * or `/Script=Greek` in `◌/Script=Greek`. The property name is a localizable
 * registry name or a canonical Unicode id (see LANGUAGE.md). Validation is a
 * later phase.
 */
export default class PatternProperty extends PatternNode {
    readonly slash: Token;
    readonly name: Token;
    readonly equal: Token | undefined;
    readonly value: Token | undefined;

    constructor(
        slash: Token,
        name: Token,
        equal: Token | undefined,
        value: Token | undefined,
    ) {
        super();
        this.slash = slash;
        this.name = name;
        this.equal = equal;
        this.value = value;
        this.computeChildren();
    }

    getDescriptor(): NodeDescriptor {
        return 'PatternProperty';
    }

    getGrammar(): Grammar {
        return [
            { name: 'slash', kind: node(Sym.Language), label: undefined },
            { name: 'name', kind: node(Sym.Name), label: undefined },
            {
                name: 'equal',
                kind: optional(node(Sym.PatternEqual)),
                label: undefined,
            },
            { name: 'value', kind: optional(node(Sym.Name)), label: undefined },
        ];
    }

    clone(replace?: Replacement) {
        return this.cloned(
            new PatternProperty(
                this.replaceChild('slash', this.slash, replace),
                this.replaceChild('name', this.name, replace),
                this.replaceChild('equal', this.equal, replace),
                this.replaceChild('value', this.value, replace),
            ),
        );
    }

    computeConflicts(): Conflict[] {
        return isKnownProperty(this.name.getText(), this.value?.getText())
            ? []
            : [new UnrecognizedPatternProperty(this)];
    }

    static readonly LocalePath = (l: LocaleText) => l.node.PatternProperty;
    getLocalePath() {
        return PatternProperty.LocalePath;
    }
}
