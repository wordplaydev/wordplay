<script module lang="ts">
    import type { ConfirmText, DialogText } from '@locale/UITexts';

    export type GlyphsPageText = {
        /** Header for the glyphs page */
        header: string;
        /** Explanation for the glyphs page */
        prompt: string;
    };
</script>

<script lang="ts">
    import Writing from '@components/app/Writing.svelte';
    import Header from '@components/app/Header.svelte';
    import { locales } from '@db/Database';
    import MarkupHtmlView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser } from '@components/project/Contexts';

    const user = getUser();
</script>

<svelte:head>
    <title>{$locales.get((l) => l.ui.page.glyphs.header)}</title>
</svelte:head>

<Writing>
    <Header>{$locales.get((l) => l.ui.page.glyphs.header)}</Header>
    <MarkupHtmlView markup={$locales.get((l) => l.ui.page.glyphs.prompt)} />
</Writing>
