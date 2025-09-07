<script lang="ts">
    import type UnparsableExpression from '@nodes/UnparsableExpression';
    import UnparsableView from './UnparsableView.svelte';

    interface Props {
        node: UnparsableExpression;
    }

    let { node }: Props = $props();
</script>

<UnparsableView {node} />
