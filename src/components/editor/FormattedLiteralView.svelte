<script lang="ts">
    import NodeSequenceView from './NodeSequenceView.svelte';
    import type FormattedLiteral from '../../nodes/FormattedLiteral';

    interface Props {
        node: FormattedLiteral;
    }

    let { node }: Props = $props();
</script>

<NodeSequenceView nodes={node.texts} />
