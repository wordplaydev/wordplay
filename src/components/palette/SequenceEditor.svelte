<script lang="ts">
    import { locales } from '@db/Database';
    import type Project from '@db/projects/Project';
    import type OutputExpression from '@edit/output/OutputExpression';
    import getSequenceProperties from '@edit/output/SequenceProperties';
    import StructureInputsEditor from '@components/palette/StructureInputsEditor.svelte';
    import SequencePresetEditor from '@components/palette/SequencePresetEditor.svelte';

    interface Props {
        project: Project;
        outputs: OutputExpression[];
        editable: boolean;
        id?: string | undefined;
    }

    let { project, outputs, editable, id = undefined }: Props = $props();

    let SequenceProperties = $derived(getSequenceProperties(project, $locales));
</script>

<StructureInputsEditor
    {project}
    {outputs}
    properties={SequenceProperties}
    {editable}
    {id}
>
    {#snippet header()}
        <SequencePresetEditor {project} {outputs} {editable} />
    {/snippet}
</StructureInputsEditor>
