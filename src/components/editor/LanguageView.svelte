<svelte:options immutable={true} />

<script lang="ts">
    import type Language from '@nodes/Language';
    import NodeView from './NodeView.svelte';

    export let node: Language;
</script>

<em
    ><NodeView node={node.slash} /><NodeView node={node.language} /><NodeView
        node={node.dash}
    /><NodeView node={node.region} /></em
>

<style>
    em {
        font-size: small;
    }
</style>
