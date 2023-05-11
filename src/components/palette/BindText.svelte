<script lang="ts">
    import type OutputPropertyValues from '@transforms/OutputPropertyValueSet';
    import TextLiteral from '@nodes/TextLiteral';
    import { preferredLanguages } from '@translation/locales';
    import TextField from '../widgets/TextField.svelte';
    import type OutputProperty from '@transforms/OutputProperty';
    import { getProject, getProjects } from '../project/Contexts';

    export let property: OutputProperty;
    export let values: OutputPropertyValues;
    export let validator: (text: string) => boolean;

    let project = getProject();
    const projects = getProjects();

    // Whenever the text changes, update in the project.
    function handleChange(newValue: string) {
        if ($project === undefined) return;
        $projects.reviseNodes(
            $project,
            $project.getBindReplacements(
                values.getExpressions(),
                property.name,
                TextLiteral.make(newValue)
            )
        );
    }
</script>

<TextField
    text={values.getText()}
    placeholder={values.isEmpty()
        ? ''
        : values.values[0].bind.names.getLocaleText($preferredLanguages)}
    {validator}
    changed={handleChange}
/>
