<script lang="ts">
    import type Concept from '@concepts/Concept';
    import ConceptGroupView from './ConceptGroupView.svelte';
    export let category: string;
    export let concepts: Concept[];
    export let selectable: boolean = true;
</script>

<h1>{category}</h1>
<ConceptGroupView {concepts} {selectable} />
