<script lang="ts">
    import type OutputPropertyValues from '@transforms/OutputPropertyValueSet';
    import TextLiteral from '@nodes/TextLiteral';
    import { preferredLanguages } from '@translation/translations';
    import TextField from '../widgets/TextField.svelte';
    import type OutputProperty from '@transforms/OutputProperty';
    import { getProject, getSelectedOutput } from '../project/Contexts';
    import { reviseProject } from '../project/project';

    export let property: OutputProperty;
    export let values: OutputPropertyValues;
    export let validator: (text: string) => boolean;

    let project = getProject();
    let selectedOutput = getSelectedOutput();

    // Whenever the text changes, update in the project.
    function handleChange(newValue: string) {
        if ($project === undefined || selectedOutput === undefined) return;
        reviseProject(
            project,
            selectedOutput,
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
        : values.values[0].bind.names.getTranslation($preferredLanguages)}
    {validator}
    changed={handleChange}
/>
