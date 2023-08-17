<svelte:options immutable={true} />

<script lang="ts">
    import type MarkupValue from '@values/MarkupValue';
    import MarkupHTMLView from '../concepts/MarkupHTMLView.svelte';

    export let value: MarkupValue;
    export let inline = true;
</script>

<MarkupHTMLView markup={value.markup} {inline} />
