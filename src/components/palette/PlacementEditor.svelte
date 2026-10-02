<script lang="ts">
    import PlaceEditor from '#components/palette/PlaceEditor.svelte';
    import StructureInputsEditor from '#components/palette/StructureInputsEditor.svelte';
    import { locales } from '#db/Database.ts';
    import type Project from '#db/projects/Project.ts';
    import OutputExpression from '#edit/output/OutputExpression.ts';
    import getStructureProperties from '#edit/output/getStructureProperties.ts';
    import Evaluate from '#nodes/Evaluate.ts';
    import { must } from '#util/nullable.ts';

    interface Props {
        project: Project;
        placement: Evaluate;
        editable: boolean;
        id?: string | undefined;
    }

    let { project, placement, editable, id = undefined }: Props = $props();

    // The Placement's first input is its Place, edited with a PlaceEditor; the rest
    // (distance, horizontal, vertical, depth) are edited as ordinary properties.
    let place = $derived(
        placement.getInput(
            // The basis declares Placement's place input.
            must(project.shares.input.Placement.inputs[0], "Placement's place"),
            project.getNodeContext(placement),
        ),
    );
    let outputs = $derived([
        new OutputExpression(project, placement, $locales),
    ]);
    let properties = $derived(
        getStructureProperties(project, $locales, placement),
    );
</script>

<div class="panel-column placement" {id}>
    {project.shares.input.Placement.names.getPreferredNameString([], true)}
    {#if place instanceof Evaluate}
        <div class="field">
            <PlaceEditor {project} {place} {editable} convertable={false} />
        </div>
    {/if}
    <StructureInputsEditor {project} {outputs} {properties} {editable} />
</div>

<style>
    .field {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        width: 100%;
    }
</style>
