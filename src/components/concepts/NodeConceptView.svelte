<script lang="ts">
    import ConceptView from './ConceptView.svelte';
    import type NodeConcept from '@concepts/NodeConcept';

    export let concept: NodeConcept;
</script>

<ConceptView {concept} />
