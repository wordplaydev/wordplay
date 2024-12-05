<script lang="ts">
    import type Markup from '../../nodes/Markup';
    import NodeSequenceView from './NodeSequenceView.svelte';

    interface Props {
        node: Markup;
    }

    let { node }: Props = $props();
</script>

<NodeSequenceView nodes={node.paragraphs} />
