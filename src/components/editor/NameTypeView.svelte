<script lang="ts">
    import type NameType from '@nodes/NameType';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: NameType;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.name} /><NodeView node={node.types} />
