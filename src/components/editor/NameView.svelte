<script lang="ts">
    import type Alias from '@nodes/Name';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: Alias;
    }

    let { node }: Props = $props();
</script>

<strong><NodeView node={node.name} /></strong><NodeView
    node={node.language}
/><NodeView node={node.separator} />
