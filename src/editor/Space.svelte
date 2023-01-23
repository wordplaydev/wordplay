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

    function render(text: string, explicit: boolean): string[] {
        return (
            explicit
                ? text.replaceAll(' ', '·').replaceAll('\t', '\xa0→')
                : text.replaceAll(' ', '\xa0').replaceAll('\t', '\xa0\xa0')
        ).split('\n');
    }
</script>

<!-- This monstrosity avoids rendering large chunks of @html, which are notoriously unreliable in hydration. -->
<span class="space" data-id={token.id}
    >{#if beforeSpaces !== undefined}{#each render(beforeSpaces, true) as s, index}{#if index > 0}<br
                    class="break"
                />{/if}{s}{/each}<InsertionPointView
        />{/if}{#each render(afterSpaces, true) as s, index}{#if index > 0}<br
                class="break"
            />{/if}{s}{/each}{#each render(additional, false) as s, index}{#if index > 0}<br
                class="break"
            />{/if}{s}{/each}</span
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
