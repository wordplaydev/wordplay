<script lang="ts">
    import type Input from '@nodes/Input';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: Input;
    }

    let { node }: Props = $props();
</script>

<small><NodeView node={node.name} /></small><NodeView
    node={node.bind}
/><NodeView node={node.value} />
