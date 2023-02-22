<script lang="ts">
    import CodeView from './CodeView.svelte';
    import type ConversionConcept from '@concepts/ConversionConcept';
    import ConceptView from './ConceptView.svelte';
    import { getConceptIndex } from '../project/Contexts';

    export let concept: ConversionConcept;

    let index = getConceptIndex();
    $: input = $index
        ? $index.getConceptOfType(concept.definition.input)
        : undefined;
    $: output = $index
        ? $index.getConceptOfType(concept.definition.output)
        : undefined;
</script>

<ConceptView {concept}>
    <h2>input</h2>
    <CodeView
        concept={input ?? concept}
        node={input ? input.getRepresentation() : concept.definition.input}
        selectable={input !== undefined}
    />

    <h2>output</h2>
    <CodeView
        concept={output ?? concept}
        node={output ? output.getRepresentation() : concept.definition.output}
        selectable={output !== undefined}
    />
</ConceptView>
