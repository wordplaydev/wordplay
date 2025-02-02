<script lang="ts">
    import type Doc from '@nodes/Doc';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: Doc;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.open} /><NodeView node={node.markup} /><NodeView
    node={node.close}
/><NodeView node={node.language} /><NodeView node={node.separator} />
