<script lang="ts">
    import Header from '../../components/app/Header.svelte';
    import Writing from '../../components/app/Writing.svelte';
    import MarkupHTMLView from '../../components/concepts/MarkupHTMLView.svelte';
    import { locales } from '../../db/Database';
</script>

<Writing>
    <Header text={(l) => l.ui.page.rights.header} />

    <MarkupHTMLView markup={(l) => l.ui.page.rights.content} />
    <MarkupHTMLView
        markup={Object.values($locales.get((l) => l.moderation.flags))
            .map((promise) => `• ${promise}`)
            .join('\n\n')}
    />
    <MarkupHTMLView markup={(l) => l.ui.page.rights.consequences} />
</Writing>
