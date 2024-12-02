<script lang="ts">
    import type OutputPropertyValues from '@edit/OutputPropertyValueSet';
    import Checkbox from '../widgets/Checkbox.svelte';
    import BooleanLiteral from '@nodes/BooleanLiteral';
    import type OutputProperty from '@edit/OutputProperty';
    import { getProject } from '../project/Contexts';
    import { Projects } from '../../db/Database';

    interface Props {
        property: OutputProperty;
        values: OutputPropertyValues;
        editable: boolean;
        id?: string | undefined;
    }

    let { property, values, editable, id = undefined }: Props = $props();

    const project = getProject();

    // Whenever the text changes, update in the project.
    function handleChange(newValue: boolean | undefined) {
        if ($project === undefined) return;
        Projects.revise(
            $project,
            $project.getBindReplacements(
                values.getExpressions(),
                property.getName(),
                newValue !== undefined
                    ? BooleanLiteral.make(newValue)
                    : undefined,
            ),
        );
    }
</script>

<Checkbox
    label={property.getName()}
    on={values.getBool()}
    changed={handleChange}
    {editable}
    {id}
/>
