<svelte:options immutable={true} />

<script lang="ts">
    import NodeSequenceView from './NodeSequenceView.svelte';
    import type FormattedLiteral from '../../nodes/FormattedLiteral';

    export let node: FormattedLiteral;
</script>

<NodeSequenceView nodes={node.texts} />
