<script lang="ts">
    import Header from '../../components/app/Header.svelte';
    import Writing from '../../components/app/Writing.svelte';
    import MarkupHtmlView from '../../components/concepts/MarkupHTMLView.svelte';
    import { locales } from '../../db/Database';
</script>

<Writing>
    <Header>{$locales.get((l) => l.ui.page.about.header)}</Header>

    <MarkupHtmlView markup={$locales.get((l) => l.ui.page.about.content)} />
</Writing>
