import { Purpose } from '#concepts/Purpose.ts';
import type Conflict from '#conflicts/Conflict.ts';
import DuplicateCaptureName from '#conflicts/DuplicateCaptureName.ts';
import EmptyPattern from '#conflicts/EmptyPattern.ts';
import UnclosedDelimiter from '#conflicts/UnclosedDelimiter.ts';
import UndefinedBackreference from '#conflicts/UndefinedBackreference.ts';
import PatternBackref from '#nodes/PatternBackref.ts';
import PatternCapture from '#nodes/PatternCapture.ts';
import { isKnownProperty } from '#runtime/pattern/properties.ts';
import type Locale from '#locale/Locale.ts';
import type Locales from '#locale/Locales.ts';
import type LocaleText from '#locale/LocaleText.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import { PATTERN_DELIMITER_SYMBOL } from '#parser/Symbols.ts';
import PatternValue from '#values/PatternValue.ts';
import type Value from '#values/Value.ts';
import Characters from '../lore/BasisCharacters';
import Literal from '#nodes/Literal.ts';
import { node, optional, type Grammar, type Replacement } from '#nodes/Node.ts';
import PatternSequence from '#nodes/PatternSequence.ts';
import PatternType from '#nodes/PatternType.ts';
import { Sym } from '#nodes/Sym.ts';
import Token from '#nodes/Token.ts';
import type Type from '#nodes/Type.ts';
import type TypeSet from '#nodes/TypeSet.ts';

/**
 * A pattern literal, e.g., `⣿3 # "-" 4 #⣿` — Wordplay's regular-expression
 * replacement (see LANGUAGE.md). The body is a {@link PatternSequence} of items.
 *
 * It is the only pattern node that is an {@link Expression}: it type-checks to
 * the `•⣿⣿` Pattern type and evaluates to a {@link PatternValue} carrying this
 * AST. The `≈`/`⌕` operators on Text then drive the match over that AST,
 * stepwise and observable, via the matcher in `#runtime/pattern` (see the class
 * note on {@link PatternValue} and the explanation in matchSteps.ts).
 */
export default class PatternLiteral extends Literal {
    readonly open: Token;
    readonly body: PatternSequence | undefined;
    readonly close: Token | undefined;

    constructor(
        open: Token,
        body: PatternSequence | undefined,
        close: Token | undefined,
    ) {
        super();
        this.open = open;
        this.body = body;
        this.close = close;
        this.computeChildren();
    }

    static make(body?: PatternSequence) {
        return new PatternLiteral(
            new Token(PATTERN_DELIMITER_SYMBOL, Sym.PatternDelimiter),
            body,
            new Token(PATTERN_DELIMITER_SYMBOL, Sym.PatternDelimiter),
        );
    }

    static getPossibleReplacements() {
        return [];
    }

    static getPossibleInsertions() {
        return [PatternLiteral.make()];
    }

    getDescriptor(): NodeDescriptor {
        return 'PatternLiteral';
    }

    getPurpose() {
        return Purpose.Patterns;
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'open',
                kind: node(Sym.PatternDelimiter),
                label: undefined,
            },
            {
                name: 'body',
                kind: optional(node(PatternSequence)),
                label: undefined,
                space: true,
            },
            {
                name: 'close',
                kind: node(Sym.PatternDelimiter),
                label: undefined,
            },
        ];
    }

    clone(replace?: Replacement) {
        return this.cloned(
            new PatternLiteral(
                this.replaceChild('open', this.open, replace),
                this.replaceChild('body', this.body, replace),
                this.replaceChild('close', this.close, replace),
            ),
        );
    }

    computeConflicts(): Conflict[] {
        const conflicts: Conflict[] = [];

        if (this.close === undefined)
            conflicts.push(
                new UnclosedDelimiter(
                    this,
                    this.open,
                    new Token(PATTERN_DELIMITER_SYMBOL, Sym.PatternDelimiter),
                ),
            );

        // An empty `⣿⣿` matches nothing useful.
        if (this.body === undefined || this.body.items.length === 0)
            conflicts.push(new EmptyPattern(this));

        // Captures and backrefs are cross-cutting, so resolve them here where
        // the whole pattern subtree is visible.
        const captures = this.nodes(
            (n): n is PatternCapture => n instanceof PatternCapture,
        );
        const names = new Set<string>();
        for (const capture of captures) {
            const name = capture.name.getText();
            if (names.has(name))
                conflicts.push(new DuplicateCaptureName(capture));
            names.add(name);
        }

        // A bare name is valid only if it names a capture or a known class. An
        // empty-name backref is the parser's missing-atom placeholder, not a real
        // backreference, so it's reported as an incomplete placeholder elsewhere
        // rather than an undefined backreference here.
        const backrefs = this.nodes(
            (n): n is PatternBackref => n instanceof PatternBackref,
        );
        for (const backref of backrefs) {
            if (backref.isPlaceholder()) continue;
            const name = backref.name.getText();
            if (!names.has(name) && !isKnownProperty(name))
                conflicts.push(new UndefinedBackreference(backref));
        }

        return conflicts;
    }

    computeType(): Type {
        return PatternType.make();
    }

    getValue(_: Locale[]): Value {
        // The value carries this source AST; `≈`/`⌕` walk it to match text
        // (match.ts), so the pattern needs no separate compilation step.
        return new PatternValue(this, this);
    }

    evaluateTypeGuards(current: TypeSet) {
        return current;
    }

    getStart() {
        return this.open;
    }
    getFinish() {
        return this.close ?? this.open;
    }

    getStartExplanations(locales: Locales) {
        return locales.concretize((l) => l.node.PatternLiteral.start, {});
    }

    getDescriptionInputs() {
        return { count: this.body ? this.body.items.length : 0 };
    }

    static readonly LocalePath = (l: LocaleText) => l.node.PatternLiteral;
    getLocalePath() {
        return PatternLiteral.LocalePath;
    }

    getCharacter() {
        return Characters.Pattern;
    }
}
