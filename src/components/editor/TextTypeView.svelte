<script lang="ts">
    import type TextType from '@nodes/TextType';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: TextType;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.open} /><NodeView node={node.text} /><NodeView
    node={node.close}
/><NodeView node={node.language} />
