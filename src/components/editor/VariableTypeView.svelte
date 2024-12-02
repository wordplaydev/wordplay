<script lang="ts">
    import NodeView from './NodeView.svelte';
    import type VariableType from '../../nodes/VariableType';

    interface Props {
        node: VariableType;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.definition} />
