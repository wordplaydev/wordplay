<svelte:options immutable={true} />

<script lang="ts">
    import type DocsValue from '@values/MarkupValue';
    import MarkupHtmlView from '../concepts/MarkupHTMLView.svelte';
    export let value: DocsValue;
</script>

<MarkupHtmlView markup={value.markup} />
