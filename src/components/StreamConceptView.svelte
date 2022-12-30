<script lang="ts">
    import CodeView from "./CodeView.svelte";
    import ConceptView from "./ConceptView.svelte";
    import type StreamConcept from "../concepts/StreamConcept";
    import { getPaletteIndex } from "../editor/util/Contexts";
    import StreamType from "../nodes/StreamType";

    export let concept: StreamConcept;

    let index = getPaletteIndex();
    $: typeConcept = concept.getTypeConcept($index);
    $: type = concept.stream.getType(concept.context);
    $: streamType = type instanceof StreamType ? type.type : type;

</script>

<ConceptView {concept}>

    <h2>value</h2>
    {#if typeConcept}
        <CodeView concept={typeConcept} node={streamType} selectable />
    {/if}

</ConceptView>