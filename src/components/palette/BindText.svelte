<script lang="ts">
    import type OutputPropertyValues from '@edit/OutputPropertyValueSet';
    import TextLiteral from '@nodes/TextLiteral';
    import TextField from '../widgets/TextField.svelte';
    import type OutputProperty from '@edit/OutputProperty';
    import { getProject } from '../project/Contexts';
    import { creator } from '../../db/Creator';

    export let property: OutputProperty;
    export let values: OutputPropertyValues;
    export let validator: (text: string) => boolean;

    let project = getProject();

    // Whenever the text changes, update in the project.
    function handleChange(newValue: string) {
        if ($project === undefined) return;
        $creator.reviseProjectNodes(
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
        : values.values[0].bind.names.getLocaleText($creator.getLanguages())}
    {validator}
    changed={handleChange}
/>
