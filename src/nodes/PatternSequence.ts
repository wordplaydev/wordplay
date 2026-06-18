import type Conflict from '@conflicts/Conflict';
import OverlappingAlternatives from '@conflicts/OverlappingAlternatives';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import Node, { list, node, type Grammar, type Replacement } from '@nodes/Node';
import PatternLiteralText from '@nodes/PatternLiteralText';
import PatternNode from '@nodes/PatternNode';
import { Sym } from '@nodes/Sym';

/**
 * A sequence of pattern items inside a pattern literal or group, with optional
 * alternation. Per LANGUAGE.md there is NO precedence: adjacency (sequence)
 * and `|` (alternation) associate strictly left-to-right. We therefore keep a
 * flat list of parts — pattern items interleaved with `|` alternation tokens —
 * which the matcher (a later phase) folds left-to-right.
 */
export default class PatternSequence extends PatternNode {
    readonly parts: Node[];

    constructor(parts: Node[]) {
        super();
        this.parts = parts;
        this.computeChildren();
    }

    /** The matchable items (excluding the `|` alternation tokens). */
    get items(): PatternNode[] {
        return this.parts.filter(
            (p): p is PatternNode => p instanceof PatternNode,
        );
    }

    getDescriptor(): NodeDescriptor {
        return 'PatternSequence';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'parts',
                kind: list(
                    false,
                    node(PatternNode),
                    node(Sym.PatternAlternation),
                ),
                label: undefined,
                space: true,
            },
        ];
    }

    clone(replace?: Replacement) {
        return new PatternSequence(
            this.replaceChild('parts', this.parts, replace),
        ) as this;
    }

    computeConflicts(): Conflict[] {
        // Warn about prefix-overlapping literal alternatives (`"cat" | "cats"`):
        // longest-match always prefers the longer, which surprises readers used
        // to first-match regex. Only flag a pure `literal | literal | …` chain so
        // we never misattribute concatenation in a multi-item branch.
        const parts = this.parts;
        const literals: PatternLiteralText[] = [];
        for (let index = 0; index < parts.length; index++) {
            const part = parts[index];
            const expectsAlternation = index % 2 === 1;
            if (expectsAlternation) {
                if (part instanceof PatternNode) return [];
            } else if (part instanceof PatternLiteralText) {
                literals.push(part);
            } else return [];
        }
        if (literals.length < 2) return [];
        for (const a of literals)
            for (const b of literals) {
                const shorter = a.getCharacters();
                const longer = b.getCharacters();
                if (shorter !== longer && longer.startsWith(shorter))
                    return [new OverlappingAlternatives(this, shorter, longer)];
            }
        return [];
    }

    static readonly LocalePath = (l: LocaleText) => l.node.PatternSequence;
    getLocalePath() {
        return PatternSequence.LocalePath;
    }
}
