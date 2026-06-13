<script lang="ts">
    import { getFolded, getSpaces } from '@components/project/Contexts';
    import FoldButton from '@components/editor/util/FoldButton.svelte';
    import {
        FOLD_GLYPH,
        FOLD_GLYPH_ROTATION,
    } from '@components/editor/util/folding';
    import { blocks, locales } from '@db/Database';
    import type Node from '@nodes/Node';

    interface Props {
        node: Node;
        /** Whether the toggle sits at the start of a line, so it should hang into
         *  the inline-start margin (see FoldButton). When omitted, it's derived
         *  from the node's own leading space — correct for inline toggles, whose
         *  node is the one rendered right after them. The `foldToggleFor` path
         *  (NodeView) passes it explicitly, since there the toggle precedes a
         *  different node than its own. */
        lineStart?: boolean;
    }

    let { node, lineStart = undefined }: Props = $props();

    const folded = getFolded();
    const spaces = getSpaces();
    let isFolded = $derived(node !== undefined && ($folded?.has(node) ?? false));
    // Hang only in text mode, and only when this node begins a new line.
    let atLineStart = $derived(
        lineStart ??
            (!$blocks && ($spaces?.getSpace(node) ?? '').includes('\n')),
    );
    // Name the node in the action (e.g. "collapse function" / "expand list") so
    // each fold control reads as a distinct, unique action to screen readers,
    // not a bare "collapse" indistinguishable from every other fold control.
    let label = $derived(
        $locales
            .concretize(
                (l) =>
                    isFolded ? l.ui.source.fold.expand : l.ui.source.fold.collapse,
                { name: node.getLabel($locales) },
            )
            .toText(),
    );
</script>

<!-- A single right-facing chevron, rotated a quarter-turn down when expanded, so
     both states share one glyph — identical size and centering, unlike mixing
     › and ⌄. Deliberately NOT the filled ▾ menu trigger or the + add-node
     trigger, so the fold control reads as distinct. -->
<FoldButton {node} {label} lineStart={atLineStart}
    ><span
        class="chevron"
        style:transform={isFolded
            ? undefined
            : `rotate(${FOLD_GLYPH_ROTATION}deg)`}>{FOLD_GLYPH}</span
    ></FoldButton
>

<style>
    /* inline-block so the chevron can rotate about its own center (the quarter-
       turn points the right-facing chevron down when expanded). */
    .chevron {
        display: inline-block;
        transition: transform calc(var(--animation-factor) * 100ms);
    }
</style>
