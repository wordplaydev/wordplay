<script lang="ts">
    import type SetOrMapAccess from '@nodes/SetOrMapAccess';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: SetOrMapAccess;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.setOrMap} /><NodeView node={node.open} /><NodeView
    node={node.key}
/><NodeView node={node.close} />
