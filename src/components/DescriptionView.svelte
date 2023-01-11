<svelte:options immutable />

<script lang="ts">
    import parseRichText from '../output/parseRichText';
    import LinkedDescription from '../translation/Explanation';
    import NodeLink from '../translation/NodeLink';
    import type { Description } from '../translation/Translation';
    import ValueLink from '../translation/ValueLink';

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
