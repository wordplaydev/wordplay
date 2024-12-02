<script lang="ts">
    import NodeView from './NodeView.svelte';
    import type IsLocale from '@nodes/IsLocale';

    interface Props {
        node: IsLocale;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.globe} /><NodeView node={node.locale} />
