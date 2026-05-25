import type LocaleText from '@locale/LocaleText';
import Language from '@nodes/Language';
import type Token from '@nodes/Token';
import type Locales from '@locale/Locales';
import Conflict, { type Resolutions } from '@conflicts/Conflict';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';
import { Sym } from '@nodes/Sym';

/** Fires when a multilingual language tag (e.g. `/es_en_es`) repeats the
 *  same language code. The two duplicate token positions are reported so the
 *  IDE can highlight both. */
export default class DuplicateLanguage extends Conflict {
    readonly language: Language;
    readonly first: Token;
    readonly second: Token;

    constructor(language: Language, first: Token, second: Token) {
        super(true);
        this.language = language;
        this.first = first;
        this.second = second;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Language.conflict.DuplicateLanguage;

    getMessage() {
        return {
            node: this.second,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => DuplicateLanguage.LocalePath(l).explanation,
                    { code: this.second.getText() },
                ),
        };
    }

    override getResolutions(
        _context: Context,
        _concepts: Node[],
    ): Resolutions {
        // Remove the duplicate name AND its preceding `_` separator from the
        // language's extras list. The extras are `[_, name, _, name, ...]`;
        // dropping just the name leaves a stray underscore.
        const dupIndex = this.language.extras.indexOf(this.second);
        const filteredExtras =
            dupIndex >= 0
                ? this.language.extras.filter(
                      (_token, i) => i !== dupIndex && i !== dupIndex - 1,
                  )
                : this.language.extras.filter(
                      (t) =>
                          t !== this.second && !t.isSymbol(Sym.LanguageJoin),
                  );
        const newLanguage = new Language(
            this.language.slash,
            this.language.language,
            filteredExtras,
            this.language.dash,
            this.language.region,
        );
        return [
            {
                kind: 'repair',
                description: (locales: Locales) =>
                    locales.concretize(
                        (l) => DuplicateLanguage.LocalePath(l).resolution,
                        { code: this.second.getText() },
                    ),
                mediator: (ctx) => ({
                    newProject: ctx.project.withRevisedNodes([
                        [this.language, newLanguage],
                    ]),
                    newNode: newLanguage,
                }),
            },
        ];
    }

    getLocalePath() {
        return DuplicateLanguage.LocalePath;
    }
}
