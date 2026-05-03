<script lang="ts">
    import type UnparsableExpression from '@nodes/UnparsableExpression';
    import type { Format } from '@components/editor/nodes/NodeView.svelte';
    import UnparsableView from '@components/editor/nodes/UnparsableView.svelte';

    interface Props {
        node: UnparsableExpression;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<UnparsableView {node} {format} />
