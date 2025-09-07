<script lang="ts">
    import type FormattedLiteral from '../../nodes/FormattedLiteral';
    import NodeSequenceView from './NodeSequenceView.svelte';

    interface Props {
        node: FormattedLiteral;
    }

    let { node }: Props = $props();
</script>

<NodeSequenceView nodes={node.texts} />
