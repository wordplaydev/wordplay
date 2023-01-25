<script lang="ts">
    import ConceptView from './ConceptView.svelte';
    import type StreamConcept from '@concepts/StreamConcept';
    import { getPaletteIndex } from '../project/Contexts';
    import StreamType from '@nodes/StreamType';

    export let concept: StreamConcept;

    let index = getPaletteIndex();
    $: type = concept.stream.getType(concept.context);
    $: streamType = type instanceof StreamType ? type.type : type;
    $: typeConcepts = $index
        ? $index.getConceptsOfTypes(streamType.getTypeSet(concept.context))
        : [];
</script>

<ConceptView {concept} types={typeConcepts} />
