<script lang="ts">
    import type OutputPropertyValues from '@edit/OutputPropertyValueSet';
    import Checkbox from '../widgets/Checkbox.svelte';
    import BooleanLiteral from '@nodes/BooleanLiteral';
    import type OutputProperty from '@edit/OutputProperty';
    import { getProject } from '../project/Contexts';
    import { creator } from '../../db/Creator';

    export let property: OutputProperty;
    export let values: OutputPropertyValues;

    const project = getProject();

    // Whenever the text changes, update in the project.
    function handleChange(newValue: boolean | undefined) {
        if ($project === undefined) return;
        $creator.reviseProjectNodes(
            $project,
            $project.getBindReplacements(
                values.getExpressions(),
                property.name,
                newValue !== undefined
                    ? BooleanLiteral.make(newValue)
                    : undefined
            )
        );
    }
</script>

<Checkbox on={values.getBool()} changed={handleChange} />
