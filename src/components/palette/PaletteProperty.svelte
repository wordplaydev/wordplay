<script lang="ts">
    import OutputPropertyRange from '@transforms/OutputPropertyRange';
    import type OutputPropertyValueSet from '@transforms/OutputPropertyValueSet';
    import Button from '../widgets/Button.svelte';
    import BindCheckbox from './BindCheckbox.svelte';
    import BindColor from './BindColor.svelte';
    import BindOptions from './BindOptions.svelte';
    import BindSlider from './BindSlider.svelte';
    import BindText from './BindText.svelte';
    import {
        preferredTranslations,
        preferredLanguages,
    } from '@translation/translations';
    import type Project from '../../models/Project';
    import OutputPropertyOptions from '@transforms/OutputPropertyOptions';
    import OutputPropertyText from '@transforms/OutputPropertyText';
    import type OutputProperty from '@transforms/OutputProperty';
    import Note from '../widgets/Note.svelte';
    import NodeView from '../editor/NodeView.svelte';
    import Evaluate from '@nodes/Evaluate';
    import { PoseType } from '@output/Pose';
    import PoseEditor from './PoseEditor.svelte';
    import { SequenceType } from '@output/Sequence';
    import SequenceEditor from './SequenceEditor.svelte';
    import SequencePosesEditor from './SequencePosesEditor.svelte';

    export let project: Project;
    export let property: OutputProperty;
    export let values: OutputPropertyValueSet;
</script>

<div class="property">
    <h3 class="name">{values.getTranslation($preferredLanguages)} </h3>
    {#if values.areSet()}
        <Button
            tip={$preferredTranslations[0].ui.tooltip.revert}
            action={() => values.unset(project, $preferredLanguages)}>⨉</Button
        >
    {:else}
        <Button
            tip={$preferredTranslations[0].ui.tooltip.set}
            action={() => values.set(project, $preferredLanguages)}>✎</Button
        >
    {/if}
    <div class="control">
        {#if values.areMixed()}
            <Note
                >{$preferredTranslations
                    .map((t) => t.ui.labels.mixed)
                    .join('/')}</Note
            >
        {:else if !values.areSet()}
            {@const expression = values.getExpression()}
            <!-- If the values arent set, show as inherited if inherited, and otherwise show the default -->
            <Note
                >{#if property.inherited}({$preferredTranslations
                        .map((t) => t.ui.labels.inherited)
                        .join(
                            '/'
                        )}){:else if values.areDefault() && expression !== undefined}<NodeView
                        node={expression}
                    /> ({$preferredTranslations
                        .map((t) => t.ui.labels.default)
                        .join('/')}){:else}&mdash;{/if}</Note
            >
        {:else if !values.areEditable(project)}
            <Note
                >{$preferredTranslations.map((t) => t.ui.labels.computed)}</Note
            >
        {:else if property.type instanceof OutputPropertyRange}
            <BindSlider {property} {values} range={property.type} />
        {:else if property.type instanceof OutputPropertyOptions}
            <BindOptions {property} {values} options={property.type} />
        {:else if property.type instanceof OutputPropertyText}
            <BindText {property} {values} validator={property.type.validator} />
        {:else if property.type === 'color'}
            <BindColor {property} {values} />
        {:else if property.type === 'bool'}
            <BindCheckbox {property} {values} />
        {:else if property.type === 'pose'}
            {@const expression = values.getExpression()}
            {#if expression instanceof Evaluate && expression.is(PoseType, project.getNodeContext(expression))}
                <PoseEditor
                    {project}
                    outputs={values.getOutputExpressions(project)}
                    sequence={false}
                />
            {:else if expression instanceof Evaluate && expression.is(SequenceType, project.getNodeContext(expression))}
                <SequenceEditor
                    {project}
                    outputs={values.getOutputExpressions(project)}
                />
            {/if}
        {:else if property.type == 'poses'}
            <SequencePosesEditor {project} map={values.getMap()} />
        {/if}
    </div>
</div>

<style>
    .property {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: baseline;
        gap: var(--wordplay-spacing);
        row-gap: var(--wordplay-spacing);
    }

    .name {
        flex-basis: 3em;
        text-align: left;
        margin: 0;
    }

    .control {
        flex-grow: 1;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--wordplay-spacing);
    }
</style>
