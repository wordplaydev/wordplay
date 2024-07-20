<script lang="ts">
    import { locales, Projects } from '@db/Database';
    import type Project from '@models/Project';
    import type BinaryEvaluate from '@nodes/BinaryEvaluate';
    import Context from '@nodes/Context';
    import type UnaryEvaluate from '@nodes/UnaryEvaluate';
    import Reference from '@nodes/Reference';
    import CodeOptions from './CodeOptions.svelte';

    export let project: Project;
    export let evaluate: BinaryEvaluate | UnaryEvaluate;
    export let context: Context;
    export let placeholder: string;
</script>

<CodeOptions
    current={evaluate.fun.name}
    label={placeholder ?? ''}
    change={(op) =>
        op ? Projects.revise(project, [[evaluate.fun, op]]) : undefined}
    options={() =>
        evaluate
            .getFunctions(context)
            .map((def) =>
                Reference.make(def.getPreferredName($locales.getLocales())),
            )}
/>
