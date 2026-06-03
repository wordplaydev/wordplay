<script lang="ts">
    import HeaderAndExplanation from '@components/app/HeaderAndExplanation.svelte';
    import Reference from '@nodes/Reference';
    import ConceptPreview from '@components/concepts/ConceptPreview.svelte';

    interface Props {
        names: string[];
    }

    let { names }: Props = $props();

    const unique = $derived(Array.from(new Set(names)));
</script>

{#if unique.length > 0}
    <HeaderAndExplanation text={(l) => l.ui.docs.header.names} sub />
    <div class="names"
        >{#each unique as name}
            <ConceptPreview localize={false} node={Reference.make(name)}></ConceptPreview>
        {/each}
    </div>
{/if}

<style>
    .names {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        row-gap: var(--wordplay-spacing);
        gap: var(--wordplay-spacing);
    }
</style>
