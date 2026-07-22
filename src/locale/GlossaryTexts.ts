import type { FormattedText } from '@locale/LocaleText';

/** One glossary entry: a localized word and a learner-facing definition. */
export type GlossaryText = {
    /** [plain] The word or short phrase for this term, shown wherever a @term reference to it appears. */
    word: string;
    /** [formatted] A short, simple definition of the term, written for young learners. */
    definition: FormattedText;
};

/**
 * The ids of Wordplay's glossary terms — vocabulary that is widely used but not
 * already defined by a language or API concept (concepts define themselves in
 * their docs). Replaces the former flat `term` block; see
 * [Glossary](src/locale/Glossary.ts) and the migration in the translation work.
 */
export type GlossaryId =
    | 'wordplay'
    | 'value'
    | 'type'
    | 'expression'
    | 'variable'
    | 'parameter'
    | 'argument'
    | 'operator'
    | 'condition'
    | 'loop'
    | 'iteration'
    | 'recursion'
    | 'property'
    | 'element'
    | 'scope'
    | 'state'
    | 'sideEffect'
    | 'abstraction'
    | 'project'
    | 'code'
    | 'act'
    | 'how'
    | 'gallery'
    | 'blocks'
    | 'placeholder'
    | 'conflict'
    | 'checkpoint'
    | 'guide'
    | 'tutorial'
    | 'name'
    | 'markup'
    | 'language'
    | 'documentation'
    | 'region'
    | 'start'
    | 'query'
    | 'key'
    | 'index'
    | 'moved'
    | 'entered'
    | 'cell'
    | 'column';

type GlossaryTexts = Record<GlossaryId, GlossaryText>;

export { type GlossaryTexts as default };
