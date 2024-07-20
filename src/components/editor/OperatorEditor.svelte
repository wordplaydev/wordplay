<script lang="ts">
    import Options from '@components/widgets/Options.svelte';
    import { Projects } from '@db/Database';
    import type Project from '@models/Project';
    import type BinaryEvaluate from '@nodes/BinaryEvaluate';
    import Context from '@nodes/Context';
    import type UnaryEvaluate from '@nodes/UnaryEvaluate';
    import Reference from '@nodes/Reference';

    export let project: Project;
    export let binary: BinaryEvaluate | UnaryEvaluate;
    export let context: Context;
    export let operator: string;
    export let placeholder: string;
</script>

<Options
    value={operator}
    label={placeholder ?? ''}
    change={(op) =>
        op
            ? Projects.revise(project, [[binary.fun, Reference.make(op)]])
            : undefined}
    width="fit-content"
    code
    options={binary.getFunctions(context).map((def) => {
        const value = def.getNames()[0];
        return {
            value,
            label: value,
        };
    })}
/>
