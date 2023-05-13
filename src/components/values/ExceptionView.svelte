<svelte:options immutable={true} />

<script lang="ts">
    import type Exception from '@runtime/Exception';
    import DescriptionView from '@components/concepts/DescriptionView.svelte';
    import { creator } from '../../db/Creator';

    export let value: Exception;
</script>

<DescriptionView description={value.getDescription($creator.getLocale())} />
