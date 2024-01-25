<svelte:options immutable={true} />

<script lang="ts">
    import type Token from '@nodes/Token';
    import InsertionPointView from './InsertionPointView.svelte';
    import type { InsertionPoint } from '../../edit/Drag';
    import { EXPLICIT_TAB_TEXT, TAB_TEXT } from '../../parser/Spaces';
    import {locales, DB, spaceIndicator} from '../../db/Database';

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
            ? []
            : render(space.substring(0, insertionIndex), true, $spaceIndicator);
    // If there's no insertion, just render the space, otherwise render the right side of the insertion.
    $: afterSpaces = render(
        insertionIndex === undefined ? space : space.substring(insertionIndex),
        true,
        $spaceIndicator
    );

    $: additionalSpaces =
        additional.length === 0 ? [] : render(additional, false, $spaceIndicator);

    function render(text: string, explicit: boolean, spaceIndicator:boolean): string[] {
        console.log('spaceIndicator change', spaceIndicator);
        return (
            explicit
                ? (spaceIndicator ? text.replaceAll(' ', '·').replaceAll('\t', EXPLICIT_TAB_TEXT):text.replaceAll('\t', EXPLICIT_TAB_TEXT))
                : text.replaceAll(' ', '\xa0').replaceAll('\t', TAB_TEXT)
        ).split('\n');
    }
</script>

<!-- 
    This monstrosity renders space, accounting for insertion points. We key on space
    to work around a Svelte defect that doesn't correctly update changes in text nodes.
-->
{#key space}
    <span class="space" role="none" data-id={token.id}
        ><span role="none" class="before"
            >{#each beforeSpaces as s, index}{#if index > 0}<span
                        ><br class="break" /></span
                    >{/if}{#if s === ''}&ZeroWidthSpace;{:else}{s}{/if}{:else}&ZeroWidthSpace;{/each}{#if insertion}<InsertionPointView
                />{/if}</span
        ><span role="none" class="after"
            >{#each afterSpaces as s, index}{#if index > 0}<span
                        ><br class="break" /></span
                    >{/if}{s}{/each}{#each additionalSpaces as s, index}{#if index > 0}<span
                        ><br class="break" /></span
                    >{/if}{#if s === ''}&ZeroWidthSpace;{:else}{s}{/if}{/each}</span
        ></span
    >
{/key}

<style>
    /* Make space visible, but just so. */
    .space {
        color: var(--wordplay-inactive-color);
    }

    /* If the space is in something dragged, hide it */
    :global(.dragged) .space {
        visibility: hidden;
    }
</style>
