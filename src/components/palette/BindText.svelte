<script lang="ts">
    import type OutputPropertyValues from '@transforms/OutputPropertyValueSet';
    import type { OutputProperty } from '@transforms/OutputExpression';

    export let property: OutputProperty;
    export let values: OutputPropertyValues;
    export let validator: (text: string) => boolean;

    // Whenever the slider value changes, revise the Evaluates to match the new value.
    // function handleChange(newValue: number) {
    //     if ($project === undefined) return;

    //     reviseProject(
    //         $project.getBindReplacements(
    //             values.getExpressions(),
    //             property.name,
    //             parseMeasurement(toTokens(newValue + range.unit))
    //         )
    //     );
    // }
</script>

TextField
