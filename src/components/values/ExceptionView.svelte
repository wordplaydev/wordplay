<svelte:options immutable={true} />

<script lang="ts">
    import type Exception from '../../runtime/Exception';
    import { creator } from '../../db/Creator';
    import MarkupHTMLView from '../concepts/MarkupHTMLView.svelte';

    export let value: Exception;
</script>

<MarkupHTMLView markup={value.getDescription($creator.getLocale())} />
