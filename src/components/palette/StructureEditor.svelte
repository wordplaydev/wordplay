<script lang="ts">
    import StructureInputsEditor from '@components/palette/StructureInputsEditor.svelte';
    import type Project from '@db/projects/Project';
    import type OutputPropertyValueSet from '@edit/output/OutputPropertyValueSet';
    import getStructureProperties from '@edit/output/getStructureProperties';
    import Evaluate from '@nodes/Evaluate';
    import StreamDefinition from '@nodes/StreamDefinition';
    import StructureDefinition from '@nodes/StructureDefinition';
    import { locales } from '@db/Database';

    interface Props {
        project: Project;
        values: OutputPropertyValueSet;
        editable: boolean;
        id?: string | undefined;
    }

    let { project, values, editable, id = undefined }: Props = $props();

    let evaluate = $derived(values.getExpression());
    let definition = $derived(
        evaluate instanceof Evaluate
            ? evaluate.getFunction(project.getNodeContext(evaluate))
            : undefined,
    );
    let outputs = $derived(values.getOutputExpressions(project, $locales));
    let properties = $derived(
        evaluate instanceof Evaluate
            ? getStructureProperties(project, $locales, evaluate)
            : [],
    );
</script>

{#if evaluate instanceof Evaluate && (definition instanceof StructureDefinition || definition instanceof StreamDefinition)}
    <div class="structure" {id}>
        <!-- Always show the structure's name (preferred symbolic name, falling back to its
             text name) so it's clear which structure is being edited. Forms like Rectangle
             have no symbolic name, so getSymbolicName() alone would render nothing. -->
        <span class="name">{$locales.getName(definition.names)}</span>
        <StructureInputsEditor {project} {outputs} {properties} {editable} />
    </div>
{/if}

<style>
    .structure {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        align-items: start;
        width: 100%;
    }
    .name {
        font-style: italic;
    }
</style>
