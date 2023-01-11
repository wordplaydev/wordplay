<script lang="ts">
    import CodeView from './CodeView.svelte';
    import type BindConcept from '../concepts/BindConcept';
    import { preferredTranslations } from '../translation/translations';
    import { getPaletteIndex } from '../editor/util/Contexts';
    import ConceptView from './ConceptView.svelte';

    export let concept: BindConcept;

    $: bind = concept.bind;

    let index = getPaletteIndex();
    $: type = $index.getConceptOfType(bind.getType(concept.context));
</script>

<ConceptView {concept} />

<h2>{$preferredTranslations[0].terminology.type}</h2>

<CodeView
    selectable
    concept={type ?? concept}
    node={type?.getRepresentation() ?? bind.getType(concept.context)}
/>
