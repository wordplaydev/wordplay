<script lang="ts">
    import type ConceptLink from '@nodes/ConceptLink';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: ConceptLink;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'concept']} {format} />
