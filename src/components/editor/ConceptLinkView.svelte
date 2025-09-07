<script lang="ts">
    import type ConceptLink from '@nodes/ConceptLink';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: ConceptLink;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.concept} />
