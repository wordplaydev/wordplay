<script lang="ts">
    import StructureInputsEditor from '#components/palette/StructureInputsEditor.svelte';
    import type Project from '#db/projects/Project.ts';
    import OutputExpression from '#edit/output/OutputExpression.ts';
    import getStructureProperties from '#edit/output/getStructureProperties.ts';
    import type Evaluate from '#nodes/Evaluate.ts';
    import { locales } from '#db/Database.ts';

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

<div class="panel-column velocity" {id}>
    {project.shares.output.Velocity.names.getSymbolicName()}
    <StructureInputsEditor {project} {outputs} {properties} {editable} />
</div>

<style></style>
