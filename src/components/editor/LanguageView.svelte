<svelte:options immutable={true} />

<script lang="ts">
    import type Language from '@nodes/Language';
    import { getHidden } from '../project/Contexts';
    import NodeView from './NodeView.svelte';

    export let node: Language;

    let hidden = getHidden();
    $: show = !$hidden?.has(node);
</script>

{#if show}<em
        ><NodeView node={node.slash} /><NodeView
            node={node.language}
        /><NodeView node={node.dash} /><NodeView node={node.region} /></em
    >{/if}

<style>
    em {
        font-size: small;
    }
</style>
