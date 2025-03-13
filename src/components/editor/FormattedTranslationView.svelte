<script lang="ts">
    import type FormattedTranslation from '../../nodes/FormattedTranslation';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: FormattedTranslation;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.open} /><NodeView node={node.markup} /><NodeView
    node={node.close}
/><NodeView node={node.language} /><NodeView node={node.separator} />
