<svelte:options immutable={true} />

<script lang="ts">
    import type Exception from '@runtime/Exception';
    import { preferredLocales } from '@locale/locales';
    import DescriptionView from '@components/concepts/DescriptionView.svelte';

    export let value: Exception;
</script>

<DescriptionView description={value.getDescription($preferredLocales[0])} />
