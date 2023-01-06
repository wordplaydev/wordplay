<svelte:options immutable />

<script lang="ts">
    import parseRichText from '../output/parseRichText';
    import LinkedDescription from '../translations/LinkedDescription';
    import NodeLink from '../translations/NodeLink';
    import type { Description } from '../translations/Translation';
    import ValueLink from '../translations/ValueLink';

    export let description: Description;
</script>

{#if description instanceof LinkedDescription}
    {#each description.parts as part}
        {#if part instanceof NodeLink}<strong>{part.getDescription()}</strong
            >{:else if part instanceof ValueLink}<strong
                >{part.getDescription()}</strong
            >{:else}{@html parseRichText(part).toHTML()}{/if}
    {/each}
{:else}
    {description}
{/if}
