<script lang="ts">
    import HeaderAndExplanation from '@components/app/HeaderAndExplanation.svelte';
    import Reference from '@nodes/Reference';
    import CodeView from './CodeView.svelte';

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
            <CodeView localize={false} node={Reference.make(name)}></CodeView>
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
