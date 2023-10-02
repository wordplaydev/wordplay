<script lang="ts">
    import Header from '../../components/app/Header.svelte';
    import Writing from '../../components/app/Writing.svelte';
    import MarkupHtmlView from '../../components/concepts/MarkupHTMLView.svelte';
    import { locale } from '../../db/Database';
</script>

<Writing>
    <Header>{$locale.ui.page.rights.header}</Header>

    <MarkupHtmlView markup={$locale.ui.page.rights.content} />
    <MarkupHtmlView
        markup={Object.values($locale.moderation.flags)
            .map((promise) => `• ${promise}`)
            .join('\n\n')}
    />
    <MarkupHtmlView markup={$locale.ui.page.rights.consequences} />
</Writing>
