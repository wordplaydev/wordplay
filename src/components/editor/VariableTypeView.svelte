<script lang="ts">
    import type VariableType from '../../nodes/VariableType';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: VariableType;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.definition} />
