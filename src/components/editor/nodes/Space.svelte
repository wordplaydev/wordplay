<script lang="ts">
    import { getShowLines } from '@components/project/Contexts';
    import type Token from '@nodes/Token';
    import { spaceIndicator } from '../../../db/Database';
    import type { InsertionPoint } from '../../../edit/Drag';
    import {
        EXPLICIT_SPACE_TEXT,
        EXPLICIT_TAB_TEXT,
        SPACE_TEXT,
        TAB_TEXT,
    } from '../../../parser/Spaces';
    import InsertionPointView from './../caret/InsertionPointView.svelte';

    interface Props {
        /** The token which this space precedes */
        token: Token;
        /** The space to render */
        space: string;
        /** The line number to render, if any */
        line: number | undefined;
        /** Whether to render in blocks mode */
        block: boolean;
        /** Whether the space should be rendered invisibly. Overrides the space indicator setting if true. */
        invisible: boolean;
        /** The insertion point to render inside the space, if any. */
        insertion?: InsertionPoint | undefined;
        /** Whether this is the first line of a source file */
        first?: boolean;
    }

    let {
        token,
        space,
        line,
        block,
        invisible = false,
        insertion = undefined,
        first = false,
    }: Props = $props();

    const showLines = getShowLines();

    function render(text: string, indicator: boolean): string[] {
        return (
            indicator
                ? text
                      .replaceAll(' ', EXPLICIT_SPACE_TEXT)
                      .replaceAll('\t', EXPLICIT_TAB_TEXT)
                : text.replaceAll(' ', SPACE_TEXT).replaceAll('\t', TAB_TEXT)
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
            : render(
                  space.substring(0, insertionIndex),
                  invisible ? false : $spaceIndicator,
              ),
    );
    // If there's no insertion, just render the space, otherwise render the right side of the insertion.
    let afterSpacesByLine = $derived(
        render(
            insertionIndex === undefined
                ? space
                : space.substring(insertionIndex),
            invisible ? false : $spaceIndicator,
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
        {#if block}{#if space !== ''}<span class="space-text"
                    >{space
                        .split('')
                        .map((s) =>
                            s === ' '
                                ? invisible || !$spaceIndicator
                                    ? SPACE_TEXT
                                    : EXPLICIT_SPACE_TEXT
                                : s,
                        )
                        .join('')}</span
                >{/if}
        {:else}
            <span role="none" class="before"
                >{#if first && $showLines}<div class="line-number">1</div
                    >{/if}{#each beforeSpacesByLine as s, index}{#if index > 0}<span
                            ><br
                                class="break"
                            />{#if firstLine !== undefined}<div
                                    class="line-number"
                                    >{firstLine + index + 1}</div
                                >{/if}</span
                        >{/if}{#if s === ''}&ZeroWidthSpace;{:else}<span
                            class="space-text"
                            data-uiid="space-text">{s}</span
                        >{/if}{:else}&ZeroWidthSpace;{/each}{#if insertion}<InsertionPointView
                    />{/if}</span
            ><span role="none" class="after"
                >{#each afterSpacesByLine as s, index}{#if index > 0}<span
                            ><br
                                class="break"
                            />{#if firstLine !== undefined}<div
                                    class="line-number"
                                    >{firstLine +
                                        beforeSpacesByLine.length +
                                        index}</div
                                >{/if}</span
                        >{/if}<span class="space-text" data-uiid="space-text"
                        >{s}</span
                    >{/each}</span
            >
        {/if}</span
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
