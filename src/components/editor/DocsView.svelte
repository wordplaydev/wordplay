<script lang="ts">
    import type Docs from '@nodes/Docs';
    import NodeSequenceView from './NodeSequenceView.svelte';

    interface Props {
        node: Docs;
    }

    let { node }: Props = $props();
</script>

<NodeSequenceView nodes={node.docs} direction="column" />
