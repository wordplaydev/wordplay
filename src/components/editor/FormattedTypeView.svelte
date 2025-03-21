<script lang="ts">
    import type FormattedType from '../../nodes/FormattedType';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: FormattedType;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.tick} />
