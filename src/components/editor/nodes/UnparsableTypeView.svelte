<script lang="ts">
    import type UnparsableType from '@nodes/UnparsableType';
    import type { Format } from '@components/editor/nodes/NodeView.svelte';
    import UnparsableView from '@components/editor/nodes/UnparsableView.svelte';

    interface Props {
        node: UnparsableType;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<UnparsableView {node} {format} />
