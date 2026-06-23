<script lang="ts">
    import StructureInputsEditor from '@components/palette/StructureInputsEditor.svelte';
    import type Project from '@db/projects/Project';
    import OutputExpression from '@edit/output/OutputExpression';
    import getStructureProperties from '@edit/output/getStructureProperties';
    import type Evaluate from '@nodes/Evaluate';
    import { locales } from '@db/Database';

    interface Props {
        project: Project;
        velocity: Evaluate;
        editable: boolean;
        id?: string | undefined;
    }

    let { project, velocity, editable, id = undefined }: Props = $props();

    let outputs = $derived([new OutputExpression(project, velocity, $locales)]);
    let properties = $derived(
        getStructureProperties(project, $locales, velocity),
    );
</script>

<div class="velocity" {id}>
    {project.shares.output.Velocity.names.getSymbolicName()}
    <StructureInputsEditor {project} {outputs} {properties} {editable} />
</div>

<style>
    .velocity {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        align-items: start;
        width: 100%;
    }
</style>
