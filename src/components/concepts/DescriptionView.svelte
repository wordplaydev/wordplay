<svelte:options immutable />

<script lang="ts">
    import parseRichText from '@output/parseRichText';
    import Description from '@locale/Description';
    import NodeLink from '@locale/NodeLink';
    import ValueLink from '@locale/ValueLink';
    import ValueView from '../values/ValueView.svelte';
    import ConceptLink from '@nodes/ConceptLink';
    import ConceptLinkUI from './ConceptLinkUI.svelte';

    export let description: string | Description;
</script>

{#if description instanceof Description}
    {#each description.parts as part}
        {#if part instanceof NodeLink}<strong>{part.getDescription()}</strong
            >{:else if part instanceof ValueLink}<strong
                ><ValueView value={part.value} /></strong
            >{:else if part instanceof ConceptLink}<ConceptLinkUI
                link={part}
            />{:else}{@html parseRichText(part).toHTML()}{/if}
    {/each}
{:else}
    {@html parseRichText(description).toHTML()}
{/if}
