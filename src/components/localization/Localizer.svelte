<script lang="ts">
    import { page } from '$app/state';
    import Subheader from '@components/app/Subheader.svelte';
    import { getLocalizing } from '@components/project/Contexts';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Note from '@components/widgets/Note.svelte';
    import { locales } from '@db/Database';
    import { localeEdits } from '@db/locales/LocalizationDexie';
    import DefaultLocale from '@locale/DefaultLocale';
    import { toLocaleString } from '@locale/LocaleText';
    import { withMonoEmoji } from '@unicode/emoji';

    let localizing = getLocalizing();

    /** The English reference text for whichever LocalizedText is currently being edited. */
    let focusedEnglishText = $derived.by(() => {
        const accessor = localizing.focused;
        if (!accessor) return undefined;
        const result = accessor(DefaultLocale);
        return Array.isArray(result) ? result.join('\n\n') : result;
    });

    /** Prefix the workspace path with the current locale segment, like Link.svelte does. */
    const workspaceHref = $derived.by(() => {
        const locale = page.params.locale;
        return locale ? `/${locale}/localize` : '/localize';
    });

    const workspaceTip = $derived(
        $locales.getPlainText((l) => l.ui.page.localize.workspaceLink),
    );

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
        <!-- Plain anchor sibling: stays clickable in localizing mode regardless of
             how the heading text is rendered as an editable salient button. -->
        <a href={workspaceHref} title={workspaceTip} class="workspace-link"
            >{withMonoEmoji('🔗')}</a
        >
        {#if activeLocaleEditCount > 0}
            <Note>{activeLocaleEditCount}</Note>
        {/if}
    </div>
    <MarkupHTMLView markup={(l) => l.ui.localize.description} />
</div>

{#if focusedEnglishText !== undefined}
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
        text-decoration: none;
        font-size: var(--wordplay-font-size);
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
