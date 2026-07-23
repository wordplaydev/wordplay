<script lang="ts">
    import CharacterView from '@components/output/CharacterView.svelte';
    import EmojisRepaired from '@components/widgets/EmojisRepaired.svelte';
    import { splitCharacterRefs } from '@output/Output/splitCharacterRefs';

    let { text }: { text: string } = $props();

    // Split into text and custom-character-reference chunks (#773), rendering
    // characters inline as SVG via CharacterView and text via EmojisRepaired.
    let chunks = $derived(splitCharacterRefs(text));
</script>
{#each chunks as chunk}{#if chunk.kind === 'character'}<CharacterView
            name={chunk.name}
        />{:else}<EmojisRepaired text={chunk.text} />{/if}{/each}
