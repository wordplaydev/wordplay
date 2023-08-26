<script lang="ts">
    import Header from '../../components/app/Header.svelte';
    import Writing from '../../components/app/Writing.svelte';
    import MarkupHtmlView from '../../components/concepts/MarkupHTMLView.svelte';
    import { locale } from '../../db/Database';
</script>

<Writing>
    <Header>{$locale.ui.page.about.header}</Header>

    <MarkupHtmlView markup={$locale.ui.page.about.content} />
</Writing>
