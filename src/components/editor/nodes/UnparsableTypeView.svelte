<script lang="ts">
    import type UnparsableType from '@nodes/UnparsableType';
    import type { Format } from './NodeView.svelte';
    import UnparsableView from './UnparsableView.svelte';

    interface Props {
        node: UnparsableType;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<UnparsableView {node} {format} />
