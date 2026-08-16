<!-- Editor for a locale's per-locale word list (`terms`): keys mapped to phrases,
     substituted wherever `$key` appears in this locale's text. Shown in the
     localization workspace, alongside the guidance editor, since terms — like
     guidance — are per-locale original content rather than translations. Edits
     persist as `terms.<key>` overrides in LocalizationDexie and submit through
     the normal bundle (setAtPath creates the key server-side). -->
<script lang="ts">
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
    import type { LocaleTextAccessor } from '@locale/Locales';
    import { toLocaleString } from '@locale/LocaleText';
    import { getAllDeclaredInputNames } from '@locale/templateInputs';
    import { withoutAnnotations } from '@locale/withoutAnnotations';
    import { CANCEL_SYMBOL, REVERT_SYMBOL } from '@parser/Symbols';

    /** The `terms.<key>` override path for a term. Empty segments are skipped by
     *  the submit walker, so no leading dot is needed (unlike top-level guidance). */
    const pathFor = (key: string) => `terms.${key}`;

    const activeLocaleString = $derived(toLocaleString($locales.getLocale()));

    /** Reserved names a term key can't use — every declared template input name. */
    const reserved = getAllDeclaredInputNames();

    /** This locale's committed terms (source), with annotations stripped. */
    const sourceTerms = $derived(
        Object.entries($locales.getLocale().terms ?? {}).map(
            ([key, phrase]) => [key, withoutAnnotations(phrase)] as const,
        ),
    );

    /** Pending `terms.<key>` overrides for the active locale. */
    const termOverrides = $derived.by(() => {
        const map = new Map<string, string>();
        const inner = $localeEdits.get(activeLocaleString);
        if (inner)
            for (const [path, value] of inner)
                if (path.startsWith('terms.')) map.set(path.slice(6), value);
        return map;
    });

    /** Every term to show: committed keys plus any locally-added ones, sorted. */
    const rows = $derived.by(() => {
        const sourceMap = new Map(sourceTerms);
        const keys = new Set<string>([
            ...sourceMap.keys(),
            ...termOverrides.keys(),
        ]);
        return [...keys].sort().map((key) => {
            const source = sourceMap.get(key);
            const override = termOverrides.get(key);
            return {
                key,
                // The value shown/edited: the pending override, else the source.
                value: override ?? source ?? '',
                inSource: source !== undefined,
                hasOverride: override !== undefined,
            };
        });
    });

    /** Save an edit to an existing term, or drop the override if it matches the
     *  committed source (nothing to suggest). */
    function savePhrase(key: string, text: string, source: string | undefined) {
        if (source !== undefined && text === source)
            deleteLocaleEdit(activeLocaleString, pathFor(key));
        else saveLocaleEdit(activeLocaleString, pathFor(key), text);
    }

    // New-term draft.
    let newKey = $state('');
    let newPhrase = $state('');

    /** Validate a would-be new key, returning an error accessor or true. */
    function validateKey(key: string): LocaleTextAccessor | true {
        const trimmed = key.trim();
        if (trimmed.length === 0) return true;
        if (!/^\p{L}[\p{L}\p{N}]*$/u.test(trimmed))
            return (l) => l.ui.localize.terms.invalidKey;
        if (rows.some((r) => r.key === trimmed))
            return (l) => l.ui.localize.terms.duplicateKey;
        if (reserved.has(trimmed))
            return (l) => l.ui.localize.terms.reservedKey;
        return true;
    }

    const canAdd = $derived(
        newKey.trim().length > 0 &&
            validateKey(newKey) === true &&
            newPhrase.trim().length > 0,
    );

    function addTerm() {
        if (!canAdd) return;
        saveLocaleEdit(activeLocaleString, pathFor(newKey.trim()), newPhrase);
        newKey = '';
        newPhrase = '';
    }
</script>

<section class="terms">
    <h2><LocalizedText path={(l) => l.ui.localize.terms.header} /></h2>
    <MarkupHTMLView markup={(l) => l.ui.localize.terms.description} />

    {#if rows.length === 0}
        <Note><LocalizedText path={(l) => l.ui.localize.terms.empty} /></Note>
    {:else}
        <ul class="list">
            {#each rows as row (row.key)}
                <li class="term">
                    <span class="key">${row.key}</span>
                    <TextField
                        id={`term-phrase-${row.key}`}
                        text={row.value}
                        description={(l) =>
                            l.ui.localize.terms.phrase.description}
                        placeholder={(l) =>
                            l.ui.localize.terms.phrase.placeholder}
                        done={(text) =>
                            savePhrase(
                                row.key,
                                text,
                                row.inSource
                                    ? (sourceTerms.find(
                                          ([k]) => k === row.key,
                                      )?.[1] ?? undefined)
                                    : undefined,
                            )}
                    />
                    <!-- A locally-added term can be removed outright; a committed
                         term can only have its pending edit reverted (deleting a
                         committed term isn't supported by the submit bundle). -->
                    {#if !row.inSource}
                        <Button
                            tip={(l) => l.ui.localize.terms.remove}
                            action={() =>
                                deleteLocaleEdit(
                                    activeLocaleString,
                                    pathFor(row.key),
                                )}
                            background>{CANCEL_SYMBOL}</Button
                        >
                    {:else if row.hasOverride}
                        <Button
                            tip={(l) => l.ui.localize.button.revert}
                            action={() =>
                                deleteLocaleEdit(
                                    activeLocaleString,
                                    pathFor(row.key),
                                )}
                            background>{REVERT_SYMBOL}</Button
                        >
                    {/if}
                </li>
            {/each}
        </ul>
    {/if}

    <div class="add">
        <span class="dollar">$</span>
        <TextField
            id="term-new-key"
            bind:text={newKey}
            description={(l) => l.ui.localize.terms.key.description}
            placeholder={(l) => l.ui.localize.terms.key.placeholder}
            validator={validateKey}
        />
        <TextField
            id="term-new-phrase"
            bind:text={newPhrase}
            description={(l) => l.ui.localize.terms.phrase.description}
            placeholder={(l) => l.ui.localize.terms.phrase.placeholder}
        />
        <Button
            tip={(l) => l.ui.localize.terms.add}
            active={canAdd}
            action={addTerm}
            background>+</Button
        >
    </div>
</section>

<style>
    .terms {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
    }

    .list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing-half);
    }

    .term,
    .add {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing-half);
        flex-wrap: wrap;
    }

    .key,
    .dollar {
        font-family: var(--wordplay-code-font);
        white-space: nowrap;
    }

    h2 {
        font-size: min(4vw, 14pt);
        margin: 0;
    }
</style>
