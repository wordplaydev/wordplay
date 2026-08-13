import type Refer from '@edit/revision/Refer';
import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';
import Token from '@nodes/Token';
import type Type from '@nodes/Type';
import type Locales from '@locale/Locales';
import type NameType from '@nodes/NameType';
import Reference from '@nodes/Reference';
import Conflict, {
    ConflictSeverity,
    type Explainer,
    type Repair,
    type Resolution,
    type Resolutions,
} from '@conflicts/Conflict';
import { LanguagesDialogID } from '@components/widgets/dialogIDs';
import { stringToLocale, type Locale } from '@locale/Locale';
import { getLocaleLanguageName } from '@locale/LocaleText';
import {
    findLocalesNaming,
    findLocalesWithKeyword,
} from '@locale/localeNameIndex';
import { LOCALE_SYMBOL } from '@parser/Symbols';
import levenshtein from '@util/levenshtein';

export class UnknownName extends Conflict {
    readonly name: Reference | NameType | Token;
    readonly type: Type | undefined;

    constructor(name: Reference | NameType | Token, type: Type | undefined) {
        super(ConflictSeverity.Error);
        this.name = name;
        this.type = type;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Reference.conflict.UnknownName.conflict;

    getMessage() {
        return {
            node: this.name,
            explanation: (locales: Locales, context: Context) =>
                locales.concretize(
                    (l) => UnknownName.LocalePath(l).explanation,
                    {
                        name:
                            this.name instanceof Token
                                ? undefined
                                : new NodeRef(this.name, locales, context),
                        scope: this.type
                            ? new NodeRef(this.type, locales, context)
                            : undefined,
                    },
                ),
        };
    }

    override getResolutions(context: Context, concepts: Node[]): Resolutions {
        let names: Refer[] = [];
        if (this.name instanceof Reference) {
            names = Reference.getPossibleReferences(
                undefined,
                this.name,
                false,
                context,
            );

            const userInput: string = this.name.name.text.text;
            const maxNames: number = 50;
            names.splice(maxNames);

            for (let i = names.length - 1; i >= 0; i--) {
                const currName: string =
                    names[i].definition.names.names[0].name.text.text;

                if (levenshtein(userInput, currName) > 1) {
                    names.splice(i, 1);
                }
            }
        }

        const repairs: Repair[] = names.map((name) => ({
            kind: 'repair',
            description: (locales: Locales) =>
                locales.concretize(
                    (l) => l.node.Reference.conflict.UnknownName.resolution,
                    {
                        suggestion: name.definition.getPreferredName(
                            locales.getLocales(),
                        ),
                    },
                ),
            mediator: (context: Context, locales: Locales) => {
                const newReference = Reference.make(
                    name.definition.getPreferredName(locales.getLocales()),
                );
                return {
                    newProject: context.project.withRevisedNodes([
                        [this.name, newReference],
                    ]),
                    newNode: newReference,
                };
            },
        }));

        // Then the same name found among the static members of a structure in scope, offered
        // as `Structure.name`. Registered rather than built here because it constructs a
        // PropertyReference, and importing node builders into a conflict file forms a cycle.
        const all = [
            ...repairs,
            ...Conflict.resolutionsFromRegistry(this, context, concepts),
            ...this.getLanguageResolutions(context),
        ];

        // No similar name in scope? Fall back to the synthesised explainer
        // (re-states the primary message and focuses the offending name).
        return all.length === 0
            ? Conflict.fallbackExplainer(this, context, concepts)
            : (all as readonly Resolution[] as Resolutions);
    }

    /**
     * A name can fail to resolve simply because the project isn't written in the language
     * that spells it that way — `Frase` means nothing until Spanish is one of the project's
     * languages (#1246). The generated name index says which languages spell it that way
     * without loading any of them.
     *
     * These are explainers, not repairs: adding a language means fetching that language's
     * text, and a repair's mediator is synchronous, so they point at the languages dialog,
     * which can. Nothing is offered until the index has loaded (Annotations starts that);
     * an unavailable index just means one fewer suggestion.
     */
    private getLanguageResolutions(context: Context): Explainer[] {
        const word =
            this.name instanceof Token
                ? this.name.getText()
                : this.name.getName();
        if (word === undefined || word.length === 0) return [];

        // English names bind in every project through the locale fallback, so declaring
        // English can't be what a *name* is missing. Its keyword words are another matter:
        // the keyword index is built from the declared locales alone, so a project written
        // only in Spanish genuinely can't lex `function` until English is declared.
        const naming = (findLocalesNaming(word) ?? []).filter(
            (code) => code !== 'en-US',
        );
        const keyworded = findLocalesWithKeyword(word) ?? [];
        if (naming.length === 0 && keyworded.length === 0) return [];

        const declared = new Set(context.project.getLocaleCodes());
        const candidates = Array.from(new Set([...naming, ...keyworded]))
            .filter((code) => !declared.has(code))
            .map((code) => ({ code, locale: stringToLocale(code) }))
            .filter(
                (candidate): candidate is { code: string; locale: Locale } =>
                    candidate.locale !== undefined,
            )
            // A word can belong to several languages; more than a few reads as noise.
            .slice(0, 3);

        return candidates.map(({ code, locale }) => ({
            kind: 'explain',
            description: (locales: Locales) =>
                locales.concretize(
                    (l) =>
                        l.node.Reference.conflict.UnknownName
                            .languageResolution,
                    {
                        name: word,
                        // The language in its own name ("español"), the way every other
                        // language label in the app reads. Not the picker's fuller
                        // "español [Mexico] (es-MX)", which is noise mid-sentence.
                        language: getLocaleLanguageName(locale) ?? code,
                    },
                ),
            focusNode: this.name,
            openDialog: LanguagesDialogID,
            openDialogIcon: LOCALE_SYMBOL,
        }));
    }

    getLocalePath() {
        return UnknownName.LocalePath;
    }
}
