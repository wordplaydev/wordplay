<script lang="ts">
    import NodeView from './NodeView.svelte';
    import type FormattedType from '../../nodes/FormattedType';

    interface Props {
        node: FormattedType;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.tick} />
