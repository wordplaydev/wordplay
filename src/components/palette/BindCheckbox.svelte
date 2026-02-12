<script lang="ts">
    import type OutputProperty from '@edit/output/OutputProperty';
    import type OutputPropertyValues from '@edit/output/OutputPropertyValueSet';
    import BooleanLiteral from '@nodes/BooleanLiteral';
    import { locales, Projects } from '../../db/Database';
    import { getProject } from '../project/Contexts';
    import Checkbox from '../widgets/Checkbox.svelte';

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
                property.getName($locales),
                newValue !== undefined
                    ? BooleanLiteral.make(newValue)
                    : undefined,
            ),
        );
    }
</script>

<Checkbox
    label={property.name}
    on={values.getBool()}
    changed={handleChange}
    {editable}
    {id}
/>
