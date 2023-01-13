<script lang="ts">
    import type BindConcept from '../concepts/BindConcept';
    import { getPaletteIndex } from '../editor/util/Contexts';
    import ConceptView from './ConceptView.svelte';

    export let concept: BindConcept;
    export let header: boolean = true;

    let index = getPaletteIndex();
    $: types = $index.getConceptsOfTypes(
        concept.getType().getTypeSet(concept.context)
    );
</script>

<ConceptView {concept} {types} {header} />
