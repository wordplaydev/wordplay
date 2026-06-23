<script lang="ts">
    import { getProject } from '@components/project/Contexts';
    import StructureInputsEditor from '@components/palette/StructureInputsEditor.svelte';
    import Options from '@components/widgets/Options.svelte';
    import { locales, Projects } from '@db/Database';
    import type Project from '@db/projects/Project';
    import type OutputPropertyValues from '@edit/output/OutputPropertyValueSet';
    import getStructureProperties from '@edit/output/getStructureProperties';
    import Evaluate from '@nodes/Evaluate';
    import Reference from '@nodes/Reference';
    import StructureDefinition from '@nodes/StructureDefinition';

    interface Props {
        project: Project;
        values: OutputPropertyValues;
        editable: boolean;
        id?: string | undefined;
    }

    let { project, values, editable, id = undefined }: Props = $props();

    const projectStore = getProject();

    // The concrete arrangement types implementing Arrangement (Row, Stack, Grid, Free).
    let types = $derived(
        Object.values(project.shares.output).filter(
            (type): type is StructureDefinition =>
                type instanceof StructureDefinition &&
                type !== project.shares.output.Arrangement &&
                type.implements(
                    project.shares.output.Arrangement,
                    project.getContext(project.getMain()),
                ),
        ),
    );

    // The arrangement Evaluate(s) being edited and which type is selected.
    let arrangements = $derived(values.getOutputExpressions(project, $locales));
    let current = $derived(arrangements[0]?.node);
    let selected = $derived.by(() => {
        if (current === undefined) return undefined;
        const fun = current.getFunction(project.getNodeContext(current));
        return types.find((type) => type === fun)?.names.getNames()[0];
    });
    let properties = $derived(
        current ? getStructureProperties(project, $locales, current) : [],
    );

    function changeType(name: string | undefined) {
        if ($projectStore === undefined || name === undefined) return;
        const type = types.find((t) => t.names.getNames()[0] === name);
        if (type === undefined) return;
        Projects.revise(
            $projectStore,
            values.getEditReplacements(
                $projectStore,
                Evaluate.make(Reference.make(name, type), []),
            ),
        );
    }
</script>

<div class="arrangement" {id}>
    <Options
        label={() =>
            values.isEmpty()
                ? ''
                : $locales.getName(values.values[0].bind.names)}
        value={selected}
        width="8em"
        options={types.map((type) => ({
            value: type.names.getNames()[0],
            label: type.names.getNames()[0],
        }))}
        change={changeType}
        {editable}
    />
    {#if properties.length > 0}
        <StructureInputsEditor
            {project}
            outputs={arrangements}
            {properties}
            {editable}
        />
    {/if}
</div>

<style>
    .arrangement {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        align-items: start;
        width: 100%;
    }
</style>
