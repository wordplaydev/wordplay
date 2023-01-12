<script lang="ts">
    import type BindConcept from '../concepts/BindConcept';
    import { getPaletteIndex } from '../editor/util/Contexts';
    import ConceptView from './ConceptView.svelte';

    export let concept: BindConcept;
    export let header: boolean = true;

    let index = getPaletteIndex();
    $: type = $index.getConceptOfType(concept.getType());
</script>

<ConceptView {concept} {type} {header} />
