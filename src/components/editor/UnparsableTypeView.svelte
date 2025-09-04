<script lang="ts">
    import type UnparsableType from '@nodes/UnparsableType';
    import UnparsableView from './UnparsableView.svelte';

    interface Props {
        node: UnparsableType;
    }

    let { node }: Props = $props();
</script>

<UnparsableView {node} />
