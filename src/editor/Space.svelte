<svelte:options immutable={true} />

<script lang="ts">
    import type Token from '../nodes/Token';
    import InsertionPointView from './InsertionPointView.svelte';
    import type { InsertionPoint } from './Drag';

    export let token: Token;
    export let space: string;
    export let additional: string;
    export let insertion: InsertionPoint | undefined = undefined;

    $: insertionIndex =
        insertion !== undefined
            ? space.split('\n', insertion.line).join('\n').length + 1
            : undefined;
    // If there's an insertion, figure out what space to render before the insertion.
    $: beforeSpaces =
        insertionIndex === undefined
            ? undefined
            : space.substring(0, insertionIndex);
    // If there's no insertion, just render the space, otherwise render the right side of the insertion.
    $: afterSpaces =
        insertionIndex === undefined ? space : space.substring(insertionIndex);
</script>

<!-- This monstrosity avoids rendering large chunks of @html, which are notoriously unreliable in hydration. -->
<span class="space" data-id={token.id}
    >{#if beforeSpaces !== undefined}{#each beforeSpaces.split('') as c}{#if c === ' '}&middot;{:else if c === '\t'}&nbsp;→{:else}<span
                    class="break"><br /></span
                >{/if}{/each}<InsertionPointView
        />{/if}{#each afterSpaces.split('') as c}{#if c === ' '}&middot;{:else if c === '\t'}&nbsp;&nbsp;{:else}<span
                class="break"><br /></span
            >{/if}{/each}{#each additional.split('') as c}{#if c === ' '}&nbsp;{:else if c === '\t'}&nbsp;&nbsp;{:else}<span
                class="break"><br /></span
            >{/if}{/each}</span
>

<style>
    /* Make space visible, but just so. */
    .space {
        color: var(--wordplay-disabled-color);
    }

    /* If the space is in something dragged, hide it */
    :global(.dragged) .space {
        visibility: hidden;
    }
</style>
