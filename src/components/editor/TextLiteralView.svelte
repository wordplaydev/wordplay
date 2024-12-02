<script lang="ts">
    import NodeSequenceView from './NodeSequenceView.svelte';
    import type TextLiteral from '../../nodes/TextLiteral';

    interface Props {
        node: TextLiteral;
    }

    let { node }: Props = $props();
</script>

<NodeSequenceView nodes={node.texts} direction="row" />
