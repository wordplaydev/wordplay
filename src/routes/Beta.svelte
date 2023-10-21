<script>
    import MarkupHtmlView from '@components/concepts/MarkupHTMLView.svelte';
    import { locales } from '@db/Database';
</script>

<div class="beta">
    <MarkupHtmlView markup={$locales.get((l) => l.ui.page.landing.beta)} /></div
>
