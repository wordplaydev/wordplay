<svelte:options immutable={true} />

<script lang="ts">
    import NodeView from './NodeView.svelte';
    import type FormattedType from '../../nodes/FormattedType';

    export let node: FormattedType;
</script>

<NodeView node={node.tick} />
