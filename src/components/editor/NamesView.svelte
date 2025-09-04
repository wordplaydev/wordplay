<script lang="ts">
    import type Names from '@nodes/Names';
    import NodeSequenceView from './NodeSequenceView.svelte';

    interface Props {
        node: Names;
    }

    let { node }: Props = $props();
</script>

<NodeSequenceView nodes={node.names} />
