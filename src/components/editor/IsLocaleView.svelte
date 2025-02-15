<script lang="ts">
    import type IsLocale from '@nodes/IsLocale';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: IsLocale;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.globe} /><NodeView node={node.locale} />
