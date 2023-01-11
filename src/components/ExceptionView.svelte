<svelte:options immutable={true} />

<script lang="ts">
    import type Exception from '../runtime/Exception';
    import { preferredTranslations } from '../translation/translations';
    import DescriptionView from './DescriptionView.svelte';

    export let value: Exception;
</script>

<DescriptionView
    description={value.getDescription($preferredTranslations[0])}
/>
