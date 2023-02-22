<script lang="ts">
    import type BindConcept from '@concepts/BindConcept';
    import { getConceptIndex } from '../project/Contexts';
    import ConceptView from './ConceptView.svelte';

    export let concept: BindConcept;
    export let header: boolean = true;

    let index = getConceptIndex();
    $: types = $index?.getConceptsOfTypes(
        concept.getType().getTypeSet(concept.context) ?? []
    );
</script>

<ConceptView {concept} {types} {header} />
