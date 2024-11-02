<script lang="ts">
    import type Token from '@nodes/Token';
    import InsertionPointView from './InsertionPointView.svelte';
    import type { InsertionPoint } from '../../edit/Drag';
    import { EXPLICIT_TAB_TEXT, TAB_TEXT } from '../../parser/Spaces';
    import { spaceIndicator } from '../../db/Database';
    import { getShowLines } from '@components/project/Contexts';

    interface Props {
        token: Token;
        space: string;
        line: number | undefined;
        insertion?: InsertionPoint | undefined;
        first?: boolean;
    }

    let {
        token,
        space,
        line,
        insertion = undefined,
        first = false,
    }: Props = $props();

    const showLines = getShowLines();

    function render(text: string, indicator: boolean): string[] {
        return (
            indicator
                ? text.replaceAll(' ', '·').replaceAll('\t', EXPLICIT_TAB_TEXT)
                : text.replaceAll(' ', '\xa0').replaceAll('\t', TAB_TEXT)
        ).split('\n');
    }

    let insertionIndex = $derived(
        insertion !== undefined
            ? space.split('\n', insertion.line).join('\n').length + 1
            : undefined,
    );
    // If there's an insertion, figure out what space to render before the insertion.
    let beforeSpacesByLine = $derived(
        insertionIndex === undefined
            ? []
            : render(space.substring(0, insertionIndex), $spaceIndicator),
    );
    // If there's no insertion, just render the space, otherwise render the right side of the insertion.
    let afterSpacesByLine = $derived(
        render(
            insertionIndex === undefined
                ? space
                : space.substring(insertionIndex),
            $spaceIndicator,
        ),
    );
    let firstLine = $derived(
        line !== undefined && $showLines
            ? line - beforeSpacesByLine.length - afterSpacesByLine.length + 1
            : undefined,
    );
</script>

<!-- 
    This monstrosity renders space, accounting for insertion points. We key on space
    to work around a Svelte defect that doesn't correctly update changes in text nodes.
    Note that CaretView.computeSpaceDimensions() depends closely on this structure.
-->
{#key [$spaceIndicator, space, line, $showLines, insertionIndex]}
    <span class="space" role="none" data-id={token.id} data-uiid="space">
        <span role="none" class="before"
            >{#if first && $showLines}<div class="line-number">1</div
                >{/if}{#each beforeSpacesByLine as s, index}{#if index > 0}<span
                        ><br class="break" />{#if firstLine !== undefined}<div
                                class="line-number">{firstLine + index + 1}</div
                            >{/if}</span
                    >{/if}{#if s === ''}&ZeroWidthSpace;{:else}<span
                        class="space-text"
                        data-uiid="space-text">{s}</span
                    >{/if}{:else}&ZeroWidthSpace;{/each}{#if insertion}<InsertionPointView
                />{/if}</span
        ><span role="none" class="after"
            >{#each afterSpacesByLine as s, index}{#if index > 0}<span
                        ><br class="break" />{#if firstLine !== undefined}<div
                                class="line-number"
                                >{firstLine +
                                    beforeSpacesByLine.length +
                                    index}</div
                            >{/if}</span
                    >{/if}<span class="space-text" data-uiid="space-text"
                    >{s}</span
                >{/each}</span
        ></span
    >
{/key}

<style>
    /* Make space visible, but just so. */
    .space {
        position: relative;
        color: var(--wordplay-inactive-color);
    }

    /* If the space is in something dragged, hide it */
    :global(.dragged) .space {
        visibility: hidden;
    }

    .line-number {
        display: inline-block;
        width: calc((var(--line-count)) * 1em);
        font-size: var(--wordplay-small-font-size);
        vertical-align: middle;
        color: var(--wordplay-inactive-color);
    }
</style>
