<script module lang="ts">
    import type { Template } from '@locale/LocaleText';

    export type RightsPageText = {
        /** Header for the rights page */
        header: string;
        /** Paragraphs for the rights page */
        content: Template[];
        /** The consequences of violating a promise. */
        consequences: Template[];
    };
</script>

<script lang="ts">
    import Header from '../../components/app/Header.svelte';
    import Writing from '../../components/app/Writing.svelte';
    import MarkupHtmlView from '../../components/concepts/MarkupHTMLView.svelte';
    import { locales } from '../../db/Database';
</script>

<Writing>
    <Header>{$locales.get((l) => l.ui.page.rights.header)}</Header>

    <MarkupHtmlView markup={$locales.get((l) => l.ui.page.rights.content)} />
    <MarkupHtmlView
        markup={Object.values($locales.get((l) => l.moderation.flags))
            .map((promise) => `• ${promise}`)
            .join('\n\n')}
    />
    <MarkupHtmlView
        markup={$locales.get((l) => l.ui.page.rights.consequences)}
    />
</Writing>
