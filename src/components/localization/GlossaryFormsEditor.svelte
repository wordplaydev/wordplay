<!-- Editor for a glossary term's other written forms (`forms`): the plurals,
     conjugations, and synonyms a `@reference` to the term may also use, so an
     inflected occurrence stays one whole link (#1241, #1244). Like `guidance`
     and the `terms` word list, these are content each locale writes for itself
     rather than a translation of en-US, so they get their own tab instead of a
     row in the string list — and a translator can't write a plural of a word
     they can't see, so each term shows its word and definition beside the field.

     A term's whole list is one edit, saved at `glossary.<id>.forms` with an
     array value; the server creates the key when a locale adopts its first form
     and removes it again when the last one goes. -->
<script lang="ts">
    import GlossaryEntry from '@components/concepts/GlossaryEntry.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Button from '@components/widgets/Button.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Note from '@components/widgets/Note.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import { locales } from '@db/Database';
    import {
        deleteLocaleEdit,
        localeEdits,
        saveLocaleEdit,
    } from '@db/locales/LocalizationDexie';
    import DefaultLocale from '@locale/DefaultLocale';
    import { getGlossaryForms } from '@locale/Glossary';
    import {
        checkGlossaryForm,
        getGlossaryWordIndex,
        getReservedFormNames,
        type GlossaryFormProblem,
    } from '@locale/glossaryFormProblem';
    import { toLocaleString } from '@locale/LocaleText';
    import { withoutAnnotations } from '@locale/withoutAnnotations';
    import { ReservedConceptIDs } from '@nodes/ConceptLink';
    import { CANCEL_SYMBOL, REVERT_SYMBOL } from '@parser/Symbols';

    /** The override path for a term's whole list of forms. */
    const pathFor = (id: string) => `glossary.${id}.forms`;

    const activeLocaleString = $derived(toLocaleString($locales.getLocale()));

    /** True when the active locale is the source locale, whose forms are the
     *  ones the reference below would show. */
    const editingSourceLocale = $derived(
        activeLocaleString === toLocaleString(DefaultLocale),
    );

    /** Pending whole-list overrides for the active locale, by term id. */
    const overrides = $derived.by(() => {
        const map = new Map<string, string[]>();
        const inner = $localeEdits.get(activeLocaleString);
        if (inner)
            for (const [path, value] of inner) {
                const match = path.match(/^glossary\.(.+)\.forms$/);
                if (match && Array.isArray(value)) map.set(match[1], value);
            }
        return map;
    });

    /** Every term, with the forms to show: the pending override if there is
     *  one, otherwise what the locale has committed. */
    const rows = $derived.by(() => {
        const locale = $locales.getLocale();
        return Object.entries(locale.glossary).map(([id, entry]) => {
            const committed = getGlossaryForms(locale, id);
            const override = overrides.get(id);
            return {
                id,
                word: withoutAnnotations(entry.word),
                forms: override ?? committed,
                committed,
                hasOverride: override !== undefined,
                english: getGlossaryForms(DefaultLocale, id),
            };
        });
    });

    /** Every term's folded word and id, and the names a reference resolves
     *  before any form, so a dead or ambiguous form is caught as it's typed
     *  rather than by the locale verifier on the contributor's pull request. */
    const words = $derived(getGlossaryWordIndex($locales.getLocale().glossary));
    const reserved = getReservedFormNames(ReservedConceptIDs);

    /** Folded form → the term that claimed it, over every term's *effective*
     *  forms — pending edits included, or two terms in one bundle could claim
     *  the same word and nothing would say so until CI. */
    const claimed = $derived.by(() => {
        const map = new Map<string, string>();
        for (const row of rows)
            for (const form of row.forms) {
                const { folded, drop } = checkGlossaryForm(row.id, form, {
                    words,
                    reserved,
                    claimed: map,
                });
                if (!drop && !map.has(folded)) map.set(folded, row.id);
            }
        return map;
    });

    /** The word to show for a term id in a message, since a term's own word
     *  reads better than its id. */
    function wordFor(id: string): string {
        return rows.find((row) => row.id === id)?.word ?? id;
    }

    /** Save a term's whole list, or drop the override when it matches what the
     *  locale already has (nothing left to suggest). */
    function save(id: string, forms: string[], committed: string[]) {
        const same =
            forms.length === committed.length &&
            forms.every((form, index) => form === committed[index]);
        if (same) deleteLocaleEdit(activeLocaleString, pathFor(id));
        else saveLocaleEdit(activeLocaleString, pathFor(id), forms);
    }

    /** The term whose add field is being typed in, and what's in it. Only one
     *  draft at a time, so the problem below belongs to an unambiguous field. */
    let draftId = $state<string | undefined>(undefined);
    let draft = $state('');

    /** What's wrong with the draft, if anything. */
    const problem = $derived.by((): GlossaryFormProblem | undefined => {
        if (draftId === undefined || draft.trim().length === 0)
            return undefined;
        return checkGlossaryForm(draftId, draft, { words, reserved, claimed })
            .problems[0];
    });

    /** A form that only helps searching is still worth adding, so it's a note
     *  rather than a refusal; everything else is dead or ambiguous. */
    const canAdd = $derived(
        draft.trim().length > 0 &&
            (problem === undefined || problem.kind === 'unreferenceable'),
    );

    function add(row: (typeof rows)[number]) {
        if (!canAdd || draftId !== row.id) return;
        save(row.id, [...row.forms, draft.trim()], row.committed);
        draft = '';
    }

    function remove(row: (typeof rows)[number], form: string) {
        save(
            row.id,
            row.forms.filter((f) => f !== form),
            row.committed,
        );
    }
</script>

<section class="glossary">
    <h2><LocalizedText path={(l) => l.ui.localize.glossary.header} /></h2>
    <MarkupHTMLView markup={(l) => l.ui.localize.glossary.description} />

    <ul class="terms">
        {#each rows as row (row.id)}
            <li class="term">
                <GlossaryEntry id={row.id} />

                {#if row.english.length > 0 && !editingSourceLocale}
                    <div class="reference">
                        <Note
                            ><LocalizedText
                                path={(l) => l.ui.localize.glossary.reference}
                            /></Note
                        >
                        <span class="english">{row.english.join(', ')}</span>
                    </div>
                {/if}

                <div class="forms">
                    {#if row.forms.length === 0}
                        <Note
                            ><LocalizedText
                                path={(l) => l.ui.localize.glossary.empty}
                            /></Note
                        >
                    {:else}
                        {#each row.forms as form (form)}
                            <span class="form">
                                {form}<Button
                                    tip={(l) => l.ui.localize.glossary.remove}
                                    action={() => remove(row, form)}
                                    >{CANCEL_SYMBOL}</Button
                                >
                            </span>
                        {/each}
                    {/if}
                    <!-- One field per term, but only the focused one holds the
                         draft, so the problem message below is unambiguous. -->
                    <TextField
                        id={`glossary-form-${row.id}`}
                        text={draftId === row.id ? draft : ''}
                        description={(l) =>
                            l.ui.localize.glossary.form.description}
                        placeholder={(l) =>
                            l.ui.localize.glossary.form.placeholder}
                        noTipBadge
                        changed={(text) => {
                            draftId = row.id;
                            draft = text;
                        }}
                        done={() => add(row)}
                    />
                    <Button
                        tip={(l) => l.ui.localize.glossary.add}
                        active={canAdd && draftId === row.id}
                        action={() => add(row)}
                        background>+</Button
                    >
                    {#if row.hasOverride}
                        <Button
                            tip={(l) => l.ui.localize.button.revert}
                            action={() =>
                                deleteLocaleEdit(
                                    activeLocaleString,
                                    pathFor(row.id),
                                )}
                            background>{REVERT_SYMBOL}</Button
                        >
                    {/if}
                </div>

                {#if draftId === row.id && problem !== undefined}
                    <div class="problem">
                        {#if problem.kind === 'own'}
                            <MarkupHTMLView
                                markup={(l) => l.ui.localize.glossary.ownWord}
                            />
                        {:else if problem.kind === 'other'}
                            <MarkupHTMLView
                                markup={[
                                    (l) => l.ui.localize.glossary.otherWord,
                                    { term: wordFor(problem.owner) },
                                ]}
                            />
                        {:else if problem.kind === 'concept'}
                            <MarkupHTMLView
                                markup={(l) =>
                                    l.ui.localize.glossary.conceptName}
                            />
                        {:else if problem.kind === 'claimed'}
                            <MarkupHTMLView
                                markup={[
                                    (l) => l.ui.localize.glossary.alreadyUsed,
                                    { term: wordFor(problem.owner) },
                                ]}
                            />
                        {:else if problem.kind === 'unreferenceable'}
                            <MarkupHTMLView
                                markup={(l) =>
                                    l.ui.localize.glossary.searchOnly}
                            />
                        {/if}
                    </div>
                {/if}
            </li>
        {/each}
    </ul>
</section>

<style>
    .glossary {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
    }

    .terms {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: calc(2 * var(--wordplay-spacing));
    }

    .term {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing-half);
        border-inline-start: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
        padding-inline-start: var(--wordplay-spacing);
    }

    .reference,
    .forms {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing-half);
        flex-wrap: wrap;
    }

    .form {
        display: inline-flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing-half);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        padding: 0 var(--wordplay-spacing-half);
    }

    .english {
        font-style: italic;
    }

    h2 {
        font-size: min(4vw, 14pt);
        margin: 0;
    }
</style>
