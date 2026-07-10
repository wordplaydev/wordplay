<script lang="ts">
    import { spaceIndicator } from '@db/Database';
    import type Token from '@nodes/Token';
    import { EXPLICIT_SPACE_TEXT, SPACE_TEXT } from '@parser/Spaces';

    /** Blocks-mode space rendering only. Text mode inlines its space spans in
     * NodeView's textSpace snippet (one component instance per space-root was a
     * large share of windowed scrolling's mount cost); the two must stay
     * consistent about the .space/.space-text structure that the caret and
     * outline measurement code reads. */
    interface Props {
        /** The token which this space precedes */
        token: Token;
        /** The space to render */
        space: string;
        /** Whether the space should be rendered invisibly. Overrides the space indicator setting if true. */
        invisible: boolean;
    }

    let { token, space, invisible = false }: Props = $props();
</script>

<!-- Keyed on the space to work around a Svelte defect that doesn't correctly
     update changes in text nodes. Keep this template free of whitespace text
     nodes — the editor is white-space: pre-wrap. -->
{#key [$spaceIndicator, space]}
    <span class="space" role="none" data-id={token.id} data-uiid="space">
        {#if space !== '' && !space.includes('\n')}<span
                class="space-text"
                data-space={space}
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
    </span>
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
</style>
