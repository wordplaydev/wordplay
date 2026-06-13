<script lang="ts">
    import FoldButton from '@components/editor/util/FoldButton.svelte';
    import { locales } from '@db/Database';
    import type Node from '@nodes/Node';

    interface Props {
        node: Node;
        /** Optional item count to show next to the ellipsis (for collapsed
         *  containers, e.g. "… 12"). */
        count?: number | undefined;
    }

    let { node, count = undefined }: Props = $props();

    let label = $derived($locales.getPlainText((l) => l.ui.source.fold.expand));
</script>

<!-- Marks the content hidden by a fold, and is itself an expand control. Views
     place it where the collapsed appearance calls for it. -->
<FoldButton {node} {label}
    >…{#if count !== undefined}&nbsp;{count}{/if}</FoldButton
>
