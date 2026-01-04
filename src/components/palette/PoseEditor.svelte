<script lang="ts">
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { Projects, locales } from '@db/Database';
    import type Project from '@db/projects/Project';
    import type OutputExpression from '@edit/output/OutputExpression';
    import type OutputProperty from '@edit/output/OutputProperty';
    import OutputPropertyValueSet from '@edit/output/OutputPropertyValueSet';
    import getPoseProperties from '@edit/output/PoseProperties';
    import Evaluate from '@nodes/Evaluate';
    import KeyValue from '@nodes/KeyValue';
    import MapLiteral from '@nodes/MapLiteral';
    import NumberLiteral from '@nodes/NumberLiteral';
    import Reference from '@nodes/Reference';
    import Button from '../widgets/Button.svelte';
    import PaletteProperty from './PaletteProperty.svelte';

    interface Props {
        project: Project;
        // takes in a list of outputexpressions to modify
        outputs: OutputExpression[];
        sequence: boolean;
        editable: boolean;
        id?: string | undefined;
    }

    let {
        project,
        outputs,
        sequence,
        editable,
        id = undefined,
    }: Props = $props();

    let PoseProperties = $derived(getPoseProperties(project, $locales, false));

    // Create a mapping from pose properties to values
    let propertyValues: Map<OutputProperty, OutputPropertyValueSet> =
        $derived.by(() => {
            const newPropertyValues = new Map();

            // Map the properties to a set of values.
            for (const property of PoseProperties) {
                const valueSet = new OutputPropertyValueSet(
                    property,
                    outputs,
                    $locales,
                );
                // Exclue any properties that happen to have no values.
                if (!valueSet.isEmpty() && valueSet.onAll())
                    newPropertyValues.set(property, valueSet);
            }
            return newPropertyValues;
        });

    function convert() {
        Projects.revise(
            project,
            outputs.map((output) => [
                output.node,
                Evaluate.make(
                    Reference.make(
                        $locales.getName(project.shares.output.Sequence.names),
                        project.shares.output.Sequence,
                    ),
                    [
                        MapLiteral.make([
                            KeyValue.make(
                                NumberLiteral.make('0%'),
                                output.node,
                            ),
                        ]),
                    ],
                ),
            ]),
        );
    }
</script>

<div class="pose-properties" {id}>
    {#each Array.from(propertyValues.entries()) as [property, values]}
        <PaletteProperty {project} {property} {values} {editable} />
    {/each}
    {#if !sequence && editable}
        <Button tip={(l) => l.ui.palette.button.sequence} action={convert}
            >{project.shares.output.Sequence.getNames()[0]}
            <LocalizedText path={(l) => l.ui.palette.button.sequence} /></Button
        >
    {/if}
</div>

<style>
    .pose-properties {
        margin-left: var(--wordplay-spacing);
        padding-left: var(--wordplay-spacing);
        border-left: solid var(--wordplay-border-color)
            var(--wordplay-border-width);

        display: flex;
        flex-direction: column;
        flex-wrap: nowrap;
        gap: var(--wordplay-spacing);
        width: 100%;
    }
</style>
