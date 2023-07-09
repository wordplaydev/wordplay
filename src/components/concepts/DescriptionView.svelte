<svelte:options immutable />

<script lang="ts">
    import parseRichText from '@output/parseRichText';
    import Description from '@locale/Description';
    import NodeRef from '@locale/NodeRef';
    import ValueRef from '@locale/ValueRef';
    import ValueView from '../values/ValueView.svelte';
    import ConceptLinkUI from './ConceptLinkUI.svelte';
    import ConceptRef from '../../locale/ConceptRef';

    export let description: string | Description;
</script>

{#if description instanceof Description}
    {#each description.parts as part}
        {#if part instanceof NodeRef}<strong>{part.getDescription()}</strong
            >{:else if part instanceof ValueRef}<strong
                ><ValueView value={part.value} /></strong
            >{:else if part instanceof ConceptRef}<ConceptLinkUI link={part} />
        {:else}{@html parseRichText(
                part === undefined ? '?' : part.toString()
            ).toHTML()}{/if}
    {/each}
{:else}
    {@html parseRichText(description).toHTML()}
{/if}
