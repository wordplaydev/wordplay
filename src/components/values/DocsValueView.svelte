<svelte:options immutable={true} />

<script lang="ts">
    import { config } from '../../db/Creator';
    import type DocsValue from '../../runtime/DocsValue';
    import MarkupHtmlView from '../concepts/MarkupHTMLView.svelte';

    export let value: DocsValue;
</script>

<MarkupHtmlView
    markup={value.docs.getLocale($config.getLocale().language).markup}
/>
