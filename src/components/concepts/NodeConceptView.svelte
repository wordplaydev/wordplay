<script lang="ts">
    import ConceptView from './ConceptView.svelte';
    import type NodeConcept from '@concepts/NodeConcept';

    interface Props {
        concept: NodeConcept;
    }

    let { concept }: Props = $props();
</script>

<ConceptView {concept} />
