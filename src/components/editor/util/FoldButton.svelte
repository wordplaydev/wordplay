<script lang="ts">
    import {
        getAnnouncer,
        getCaret,
        getFolded,
    } from '@components/project/Contexts';
    import { toggleFolded } from '@components/editor/util/folding';
    import { locales } from '@db/Database';
    import type Node from '@nodes/Node';
    import { tick, type Snippet } from 'svelte';

    interface Props {
        node: Node;
        /** ARIA label describing the action. */
        label: string;
        /** When the toggle sits at the start of a line, hang it into the
         *  inline-start margin so the first token lands at the line's normal
         *  indentation (successive lines — e.g. a list of docs — then align). */
        lineStart?: boolean;
        children: Snippet;
    }

    let { node, label, lineStart = false, children }: Props = $props();

    const folded = getFolded();
    const announce = getAnnouncer();
    const caret = getCaret();
    let isFolded = $derived(node !== undefined && ($folded?.has(node) ?? false));

    /** Move the editor caret to where this fold control appears (the node's first
     *  token), so keyboard users can step into the node's code straight from the
     *  toggle. Fires on focus, covering both Tab navigation and click. */
    function moveCaretToToggle() {
        caret?.update((c) => {
            const position = c.source.getNodeFirstPosition(node);
            return position === undefined ? c : c.withPosition(position);
        });
    }

    /** The nearest scrollable ancestor — the editor's scroll container. */
    function findScrollParent(el: HTMLElement | null): HTMLElement | null {
        let current: HTMLElement | null = el?.parentElement ?? null;
        while (current) {
            const overflowY = getComputedStyle(current).overflowY;
            if (
                (overflowY === 'auto' || overflowY === 'scroll') &&
                current.scrollHeight > current.clientHeight
            )
                return current;
            current = current.parentElement;
        }
        return null;
    }

    // Mirrors the project Button widget's in-editor handling: pointerdown
    // prevents the editor from moving the caret; mouse activation is via click;
    // keyboard activation (Enter/Space) is handled in keydown with preventDefault
    // so it both stops the editor's keystroke handling and suppresses the
    // synthesized click (no double toggle).
    async function activate(event: Event) {
        event.preventDefault();
        event.stopPropagation();

        // Folding/unfolding changes the document height, which would otherwise
        // shift the toggled node (and everything else) on screen. Anchor the
        // scroll to this node: record its viewport position, apply the fold,
        // then correct the scroll container by however much it moved so the
        // toggle stays put under the pointer.
        const anchorId = `node-${node.id}`;
        const before = document
            .getElementById(anchorId)
            ?.getBoundingClientRect().top;
        const scroller = findScrollParent(document.getElementById(anchorId));

        toggleFolded(folded, node);
        // Announce the resulting state for screen readers, naming the node so the
        // announcement is specific (e.g. "function collapsed", not just
        // "collapsed").
        const nowFolded = !isFolded;
        if (announce && $announce)
            $announce(
                'fold',
                $locales.getLanguages()[0],
                $locales
                    .concretize(
                        (l) =>
                            nowFolded
                                ? l.ui.source.fold.collapsed
                                : l.ui.source.fold.expanded,
                        { name: node.getLabel($locales) },
                    )
                    .toText(),
            );

        await tick();

        // Folding swaps which view branch renders, so this button is replaced by
        // a fresh element in the other branch and focus would be lost. Node ids
        // are stable across folding (no reparse), so refocus the node's new
        // toggle to keep keyboard users anchored on the control they activated.
        const toggle = document.querySelector(`[data-fold-node="${node.id}"]`);
        if (toggle instanceof HTMLElement) toggle.focus();

        if (before !== undefined) {
            const after = document
                .getElementById(anchorId)
                ?.getBoundingClientRect().top;
            if (after !== undefined) {
                const delta = after - before;
                if (delta !== 0) {
                    if (scroller) scroller.scrollTop += delta;
                    else window.scrollBy(0, delta);
                }
            }
        }
    }
</script>

<button
    type="button"
    class="fold-button"
    class:line-start={lineStart}
    data-fold-node={node.id}
    aria-label={label}
    aria-expanded={!isFolded}
    onpointerdown={(event) => {
        event.preventDefault();
        event.stopPropagation();
    }}
    onfocus={moveCaretToToggle}
    onclick={activate}
    onkeydown={(event) => {
        // Only activate on a bare Enter/Space, matching the Button widget:
        // Enter with modifiers is reserved for other editor shortcuts.
        if (
            (event.key === 'Enter' || event.key === ' ') &&
            !event.shiftKey &&
            !event.ctrlKey &&
            !event.altKey &&
            !event.metaKey
        )
            activate(event);
    }}>{@render children()}</button
>

<style>
    .fold-button {
        cursor: pointer;
        user-select: none;
        background: none;
        border: none;
        padding: 0;
        margin: 0;
        font: inherit;
        line-height: inherit;
        vertical-align: baseline;
        color: var(--wordplay-inactive-color);
        font-size: var(--wordplay-small-font-size);
        padding-inline: var(--wordplay-spacing-half);
        display: inline-block;
        transform-origin: center;
        transition:
            transform calc(var(--animation-factor) * 100ms),
            color calc(var(--animation-factor) * 100ms);
    }
    /* Grow and brighten on hover/focus so the control reads as interactive. */
    .fold-button:hover,
    .fold-button:focus-visible {
        color: var(--wordplay-foreground);
        transform: scale(1.4);
    }
    .fold-button:active {
        transform: scale(1.1);
    }
    .fold-button:focus-visible {
        outline: var(--wordplay-focus-width) solid var(--wordplay-focus-color);
        border-radius: var(--wordplay-border-radius);
    }
    /* At the start of a line, occupy zero net inline space: a fixed-width box
       (chevron centered) pulled left by exactly its own width, so it hangs in the
       inline-start margin and the first token lands at the line's normal
       indentation. Width == margin keeps the alignment exact regardless of the
       glyph's intrinsic width. */
    .fold-button.line-start {
        width: 1em;
        padding-inline: 0;
        text-align: center;
        margin-inline-start: -1em;
    }
</style>
