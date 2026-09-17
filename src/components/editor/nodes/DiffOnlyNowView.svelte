<script lang="ts">
    /**
     * Code the project's current version has and the version being viewed does
     * not — what restoring this version would take away, drawn in place and
     * struck through (#633).
     *
     * It deliberately does NOT render through `NodeView`. Those views read the
     * *before* source's root, spaces, hidden set, highlights and folds from
     * context, none of which know these nodes; and `TokenView` emits
     * `data-id={node.id}` and `id="node-{id}"`, where ids come from a global
     * counter — so an after-tree token rendered that way would collide with the
     * live source mounted in another tile, and `Editor.getNodeView` would
     * resolve a caret to the wrong element.
     *
     * For the same reason it matches none of the editor's own selectors: see
     * `diffGhostConvention.test.ts`, which lists each one and what reads it.
     *
     * Tokens are all one dimmed color rather than syntax-colored. Dimming a
     * category color means compositing it, which voids the AA contrast the
     * palette guarantees and the axe scan measures; and this text is an
     * annotation on the version being read, not a second copy of the program.
     *
     * It carries no chip: the chip is spoken for by code that would come back,
     * and this is the opposite half of the same decision.
     */
    import type Node from '@nodes/Node';
    import type Spaces from '@parser/Spaces';
    import { SPACE_TEXT, TAB_TEXT } from '@parser/Spaces';

    interface Props {
        /** Current-version nodes standing in for code this version doesn't have. */
        nodes: Node[];
        /** The current version's spacing — the only place these tokens' own
         *  spacing exists, since the viewed source's `Spaces` never saw them. */
        spaces: Spaces;
        /** Whether a line may break here, so a space is ordinary rather than
         *  non-breaking. See `Format.wrapping`. */
        wrapping: boolean;
    }

    let { nodes, spaces, wrapping }: Props = $props();

    /**
     * The run's tokens with their preceding space, as lines. The first token's
     * own leading space is dropped and replaced by a single separator: in the
     * current version it separates this code from a token that isn't here, and
     * reproducing it would indent this away from the code it belongs to.
     *
     * A raw newline would not break — `.editor` is `white-space: nowrap` unless
     * soft wrap is on — so lines are split here and rendered as `<br>`.
     */
    let lines = $derived.by(() => {
        const leaves = nodes.flatMap((node) => node.leaves());
        const text = leaves
            .map(
                (token, index) =>
                    (index === 0 ? '' : spaces.getSpace(token)) +
                    token.getText(),
            )
            .join('');
        return (
            wrapping
                ? text.replaceAll('\t', '  ')
                : text.replaceAll(' ', SPACE_TEXT).replaceAll('\t', TAB_TEXT)
        ).split('\n');
    });
</script>

<span class="diff-leaves" aria-hidden="true"
    >{#each lines as line, index}{#if index > 0}<br />{/if}{line}{/each}</span
>

<style>
    /*  `pointer-events: none` is load-bearing, not decorative: the editor
        hit-tests with document.elementFromPoint, and a hit landing here would
        swallow the pointerdown that places the caret. Passing through lets the
        editor resolve to the nearest real token on the row instead. */
    .diff-leaves {
        pointer-events: none;
        user-select: none;
        color: var(--wordplay-inactive-color);
        font-family: var(--wordplay-code-font);
        /* Struck, because restoring takes this away. The shape carries the
           meaning on its own, so nothing here depends on hue (WCAG 1.4.1), and
           a real `line-through` sits where the font says to rather than at half
           the box's height. */
        text-decoration: line-through;
        text-decoration-thickness: var(--wordplay-focus-width);
        padding-inline: var(--wordplay-spacing-half);
    }
</style>
