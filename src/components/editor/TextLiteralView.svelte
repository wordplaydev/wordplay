<script lang="ts">
    import type TextLiteral from '../../nodes/TextLiteral';
    import NodeSequenceView from './NodeSequenceView.svelte';

    interface Props {
        node: TextLiteral;
    }

    let { node }: Props = $props();
</script>

<NodeSequenceView nodes={node.texts} direction="row" />
