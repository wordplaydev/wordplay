<script lang="ts">
    import PlaceEditor from '@components/palette/PlaceEditor.svelte';
    import StructureInputsEditor from '@components/palette/StructureInputsEditor.svelte';
    import { locales } from '@db/Database';
    import type Project from '@db/projects/Project';
    import OutputExpression from '@edit/output/OutputExpression';
    import getStructureProperties from '@edit/output/getStructureProperties';
    import Evaluate from '@nodes/Evaluate';

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
            project.shares.input.Placement.inputs[0],
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

<div class="placement" {id}>
    {project.shares.input.Placement.names.getPreferredNameString([], true)}
    {#if place instanceof Evaluate}
        <div class="field">
            <PlaceEditor {project} {place} {editable} convertable={false} />
        </div>
    {/if}
    <StructureInputsEditor {project} {outputs} {properties} {editable} />
</div>

<style>
    .placement {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        align-items: start;
        width: 100%;
    }
    .field {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        width: 100%;
    }
</style>
