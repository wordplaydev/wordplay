<script lang="ts">
    import Link from '@components/app/Link.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import TemplateInputsPanel from '@components/localization/TemplateInputsPanel.svelte';
    import { accessorToLocalePath } from '@components/localization/accessorToLocalePath';
    import { getLocalizing } from '@components/project/Contexts';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Note from '@components/widgets/Note.svelte';
    import { locales } from '@db/Database';
    import { localeEdits } from '@db/locales/LocalizationDexie';
    import DefaultLocale from '@locale/DefaultLocale';
    import { toLocaleString } from '@locale/LocaleText';

    let localizing = getLocalizing();

    /** The English reference text for whichever LocalizedText is currently being edited. */
    let focusedEnglishText = $derived.by(() => {
        const accessor = localizing.focused;
        if (!accessor) return undefined;
        const result = accessor(DefaultLocale);
        return Array.isArray(result) ? result.join('\n\n') : result;
    });

    /** Dotted path of the focused field, for the TemplateInputsPanel. */
    const focusedPath = $derived.by(() => {
        const accessor = localizing.focused;
        if (!accessor) return undefined;
        return accessorToLocalePath(accessor)?.toString();
    });

    /** The text currently being edited (for the panel to live-check refs). We
     *  resolve via the active locale so chip status reflects the translator's
     *  in-progress draft, not the English reference. */
    const focusedDraft = $derived.by(() => {
        const accessor = localizing.focused;
        if (!accessor) return '';
        const result = accessor($locales.getLocale());
        return Array.isArray(result) ? result.join('\n\n') : (result ?? '');
    });

    /** Number of pending edits for the currently-active locale. Edits made
     *  under other locales aren't counted here; submissions are one locale
     *  at a time. */
    const activeLocaleEditCount = $derived(
        $localeEdits.get(toLocaleString($locales.getLocale()))?.size ?? 0,
    );
</script>

<div class="localizer-header">
    <div class="title">
        <Subheader text={(l) => l.ui.localize.header} />
        {#if activeLocaleEditCount > 0}
            <Note>{activeLocaleEditCount}</Note>
        {/if}
        <!-- Pinned to the right edge of the row via `margin-inline-start: auto`
             on the wrapper, so the link sits opposite the heading regardless
             of how the heading text reflows. -->
        <span class="workspace-link">
            <Link
                to="/localize"
                label={(l) => l.ui.page.localize.workspaceLink}
            />
        </span>
    </div>
    <MarkupHTMLView markup={(l) => l.ui.localize.description} />
</div>

{#if focusedEnglishText !== undefined}
    <TemplateInputsPanel
        path={focusedPath}
        text={focusedDraft}
        view={undefined}
        compact
    />
    <div class="reference">
        <h3><LocalizedText path={(l) => l.ui.localize.reference} /></h3>
        <p>{focusedEnglishText}</p>
    </div>
{/if}

<style>
    .localizer-header {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing-half);
    }

    .title {
        display: flex;
        flex-direction: row;
        align-items: baseline;
        gap: var(--wordplay-spacing);
        flex-wrap: wrap;
    }

    .workspace-link {
        margin-inline-start: auto;
        font-size: var(--wordplay-small-font-size);
        line-height: 1;
        cursor: pointer;
    }

    .reference {
        margin-block-start: var(--wordplay-spacing);
    }

    h3 {
        font-size: min(4vw, 14pt);
        margin: 0 0 var(--wordplay-spacing) 0;
    }

    p {
        margin: 0;
    }
</style>
