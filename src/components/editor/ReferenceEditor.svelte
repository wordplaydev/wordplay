<script lang="ts">
    import { Projects } from '@db/Database';
    import type Project from '@models/Project';
    import Context from '@nodes/Context';
    import Reference from '@nodes/Reference';
    import CodeOptions from './CodeOptions.svelte';

    export let project: Project;
    export let reference: Reference;
    export let context: Context;
    export let placeholder: string;
</script>

<CodeOptions
    current={reference.name}
    label={placeholder ?? ''}
    change={(op) =>
        op ? Projects.revise(project, [[reference, op]]) : undefined}
    options={() =>
        reference
            .getDefinitionsInScope(context)
            .map((def) => Reference.make(def.getNames()[0], def))}
/>
