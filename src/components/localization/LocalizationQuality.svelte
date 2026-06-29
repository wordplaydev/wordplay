<script lang="ts">
    import Notice from '@components/app/Notice.svelte';
    import Button from '@components/widgets/Button.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { functions } from '@db/firebase';
    import { locales } from '@db/Database';
    import scanLiteralGlossaryTerms from '@locale/glossaryScan';
    import { toLocaleString } from '@locale/LocaleText';
    import { withoutAnnotations } from '@locale/withoutAnnotations';
    import { httpsCallable } from 'firebase/functions';
    import type {
        AnalyzeLocalizationInputs,
        AnalyzeLocalizationOutput,
        LiteralTermFinding,
    } from 'shared-types';

    /**
     * Per-string quality aids for a localization editor: a live, free glossary
     * heuristic that offers one-click `@term` fixes, and an on-demand AI
     * reading-level check. Reused by the in-context markup editor
     * ([MarkupHTMLView](src/components/concepts/MarkupHTMLView.svelte)) and the
     * [localization workspace](src/routes/[[locale]]/localize/+page.svelte).
     */
    let {
        text,
        localeKey,
        onfix,
    }: {
        /** The live draft being edited. */
        text: string;
        /** The string's locale path, for the reading-level call. */
        localeKey: string | undefined;
        /** Apply a suggestion (replace the draft with the symbolized text). */
        onfix: (suggestion: string) => void;
    } = $props();

    /** The active locale's glossary words (annotation-free), for the scan. */
    const glossaryWords = $derived(
        Object.entries($locales.getLocale().glossary)
            .map(([id, entry]) => ({
                id,
                word: withoutAnnotations(entry.word),
            }))
            .filter((g) => g.word.length > 0),
    );

    let literalTerms = $state<LiteralTermFinding[]>([]);
    let readingLevel = $state<{ complex: boolean; note: string } | undefined>(
        undefined,
    );
    let checking = $state(false);

    // Debounced glossary scan: ~0.8s after the contributor stops typing.
    $effect(() => {
        const draft = text;
        const words = glossaryWords;
        const timer = setTimeout(() => {
            literalTerms = scanLiteralGlossaryTerms(draft, words);
        }, 800);
        return () => clearTimeout(timer);
    });

    // A reading-level result is only valid for the text it was computed from.
    $effect(() => {
        text;
        readingLevel = undefined;
    });

    /** On-demand reading-level check via the analyzeLocalization function. */
    async function checkReadingLevel() {
        if (functions === undefined) return;
        checking = true;
        try {
            const analyze = httpsCallable<
                AnalyzeLocalizationInputs,
                AnalyzeLocalizationOutput
            >(functions, 'analyzeLocalization');
            const result = (
                await analyze({
                    locale: toLocaleString($locales.getLocale()),
                    sourceLocale: 'en-US',
                    strings: [{ key: localeKey ?? '', text }],
                    glossary: [],
                    backTranslate: false,
                })
            ).data;
            const first = result?.[0];
            readingLevel =
                first !== undefined
                    ? { complex: first.complex, note: first.readingLevelNote }
                    : undefined;
        } catch {
            readingLevel = undefined;
        } finally {
            checking = false;
        }
    }
</script>

{#if literalTerms.length > 0}
    <Notice>
        <p>
            <LocalizedText
                path={(l) => l.ui.page.localize.literalTermsWarning}
            />
        </p>
        <div class="literal-terms">
            {#each literalTerms as finding (finding.id)}
                <button
                    type="button"
                    class="term-fix"
                    onclick={() => onfix(finding.suggestion)}
                    >{finding.term} → ${finding.id}</button
                >
            {/each}
        </div>
    </Notice>
{/if}
{#if readingLevel !== undefined}
    {@const rl = readingLevel}
    <Notice>
        {#if rl.complex}
            <!-- Lead with the model's specific WCAG plain-language note (which
                 principle to fix); fall back to the generic message if absent. -->
            {#if rl.note.length > 0}
                <p class="reading-note">{rl.note}</p>
            {:else}
                <p>
                    <LocalizedText
                        path={(l) => l.ui.page.localize.readingLevelComplex}
                    />
                </p>
            {/if}
        {:else}
            <p>
                <LocalizedText
                    path={(l) => l.ui.page.localize.readingLevelOk}
                />
            </p>
        {/if}
    </Notice>
{/if}
{#if functions !== undefined}
    <div class="quality-actions">
        <Button
            tip={(l) => l.ui.page.localize.checkReadingLevel}
            active={!checking && text.trim().length > 0}
            action={checkReadingLevel}
            background>📖</Button
        >
    </div>
{/if}

<style>
    .literal-terms {
        display: flex;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing-half);
        margin-block-start: var(--wordplay-spacing-half);
    }

    /* Inside a Notice the inherited color is --wordplay-background (the Notice
       inverts text on its colored ground), so set an explicit foreground/
       background pair to stay legible in both light and dark modes. */
    .term-fix {
        font-family: var(--wordplay-code-font);
        cursor: pointer;
        border: var(--wordplay-border-width) solid var(--wordplay-foreground);
        border-radius: var(--wordplay-border-radius);
        background: var(--wordplay-background);
        color: var(--wordplay-foreground);
        padding: 0 var(--wordplay-spacing-half);
    }

    .term-fix:hover {
        background: var(--wordplay-hover);
    }

    .reading-note {
        margin-block-start: var(--wordplay-spacing-half);
        font-style: italic;
    }

    .quality-actions {
        margin-block-start: var(--wordplay-spacing-half);
    }
</style>
