<script lang="ts">
    import type NodeConcept from '#concepts/NodeConcept.ts';
    import ConceptView from '#components/concepts/ConceptView.svelte';

    interface Props {
        concept: NodeConcept;
    }

    let { concept }: Props = $props();
</script>

<ConceptView {concept} />
