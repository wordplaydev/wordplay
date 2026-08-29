import type LocaleText from '@locale/LocaleText';
import Language from '@nodes/Language';
import type Token from '@nodes/Token';
import type Locales from '@locale/Locales';
import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '@conflicts/Conflict';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';
import { Sym } from '@nodes/Sym';

/** Fires when a multilingual language tag (e.g. `/es_en_es`) names the same
 *  language — or the same region — twice, however each is spelled: `/es_Spanish`
 *  repeats Spanish. The two duplicate token positions are reported so the IDE
 *  can highlight both. */
export default class DuplicateLanguage extends Conflict {
    readonly language: Language;
    readonly first: Token;
    readonly second: Token;
    /** Which half of the tag repeated. Languages and regions live in separate
     *  token lists, so the repair has to filter the right one. */
    readonly which: 'language' | 'region';

    constructor(
        language: Language,
        first: Token,
        second: Token,
        which: 'language' | 'region' = 'language',
    ) {
        super(ConflictSeverity.Minor);
        this.language = language;
        this.first = first;
        this.second = second;
        this.which = which;
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

    override getResolutions(_context: Context, _concepts: Node[]): Resolutions {
        // Remove the duplicate name AND its preceding `_` separator from the
        // language's extras list. The extras are `[_, name, _, name, ...]`;
        // dropping just the name leaves a stray underscore.
        const list =
            this.which === 'region'
                ? this.language.regionExtras
                : this.language.extras;
        const dupIndex = list.indexOf(this.second);
        const filtered =
            dupIndex >= 0
                ? list.filter(
                      (_token, i) => i !== dupIndex && i !== dupIndex - 1,
                  )
                : list.filter(
                      (t) => t !== this.second && !t.isSymbol(Sym.LanguageJoin),
                  );
        // Rebuild with every field: filtering the language extras and dropping
        // regionExtras (or the reverse) would delete the parts of the tag that
        // weren't duplicated.
        const newLanguage = new Language(
            this.language.slash,
            this.language.language,
            this.which === 'region' ? this.language.extras : filtered,
            this.language.dash,
            this.language.region,
            this.which === 'region' ? filtered : this.language.regionExtras,
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
