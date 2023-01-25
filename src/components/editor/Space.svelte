<svelte:options immutable={true} />

<script lang="ts">
    import type Token from '@nodes/Token';
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
            : render(space.substring(0, insertionIndex), true);
    // If there's no insertion, just render the space, otherwise render the right side of the insertion.
    $: afterSpaces = render(
        insertionIndex === undefined ? space : space.substring(insertionIndex),
        true
    );

    $: additionalSpaces =
        additional.length === 0 ? [] : render(additional, false);

    function render(text: string, explicit: boolean): string[] {
        return (
            explicit
                ? text.replaceAll(' ', '·').replaceAll('\t', '\xa0→')
                : text.replaceAll(' ', '\xa0').replaceAll('\t', '\xa0\xa0')
        ).split('\n');
    }
</script>

<!-- 
    This monstrosity renders space, accounting for insertion points. We key on space
    to work around a Svelte defect that doesn't correctly update changes in text nodes.
-->
{#key space}
    <span class="space" data-id={token.id}
        >{#if beforeSpaces !== undefined}{#each beforeSpaces as s, index}{#if index > 0}<br
                        class="break"
                    />{/if}{#if s === ''}&ZeroWidthSpace;{:else}{s}{/if}{/each}<InsertionPointView
            />{/if}{#each afterSpaces as s, index}{#if index > 0}<br
                    class="break"
                />{/if}{s}{/each}{#each additionalSpaces as s, index}{#if index > 0}<br
                    class="break"
                />{/if}{#if s === ''}&ZeroWidthSpace;{:else}{s}{/if}{/each}</span
    >
{/key}

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
