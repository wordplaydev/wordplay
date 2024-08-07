<svelte:options immutable={true} />

<script lang="ts">
    import type Input from '@nodes/Input';
    import NodeView from './NodeView.svelte';

    export let node: Input;
</script>

<small><NodeView node={node.name} /></small><NodeView
    node={node.bind}
/><NodeView node={node.value} />
