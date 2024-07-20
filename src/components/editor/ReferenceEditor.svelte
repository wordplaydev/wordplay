<script lang="ts">
    import Options from '@components/widgets/Options.svelte';
    import { Projects } from '@db/Database';
    import type Project from '@models/Project';
    import Context from '@nodes/Context';
    import Reference from '@nodes/Reference';

    export let project: Project;
    export let reference: Reference;
    export let context: Context;
    export let placeholder: string;
</script>

<Options
    value={reference.getName()}
    label={placeholder ?? ''}
    change={(op) =>
        op
            ? Projects.revise(project, [[reference, Reference.make(op)]])
            : undefined}
    width="fit-content"
    code
    options={reference.getDefinitionsInScope(context).map((def) => {
        const value = def.getNames()[0];
        return {
            value,
            label: value,
        };
    })}
/>
