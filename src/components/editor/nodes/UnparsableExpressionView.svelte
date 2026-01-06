<script lang="ts">
    import type UnparsableExpression from '@nodes/UnparsableExpression';
    import type { Format } from './NodeView.svelte';
    import UnparsableView from './UnparsableView.svelte';

    interface Props {
        node: UnparsableExpression;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<UnparsableView {node} {format} />
