<script lang="ts">
    import OutputPropertyRange from '@edit/OutputPropertyRange';
    import type OutputPropertyValueSet from '@edit/OutputPropertyValueSet';
    import Button from '../widgets/Button.svelte';
    import BindCheckbox from './BindCheckbox.svelte';
    import BindColor from './BindColor.svelte';
    import BindOptions from './BindOptions.svelte';
    import BindSlider from './BindSlider.svelte';
    import BindText from './BindText.svelte';
    import type Project from '@models/Project';
    import OutputPropertyOptions from '@edit/OutputPropertyOptions';
    import OutputPropertyText from '@edit/OutputPropertyText';
    import type OutputProperty from '@edit/OutputProperty';
    import Note from '../widgets/Note.svelte';
    import NodeView from '../editor/NodeView.svelte';
    import Evaluate from '@nodes/Evaluate';
    import PoseEditor from './PoseEditor.svelte';
    import SequenceEditor from './SequenceEditor.svelte';
    import SequencePosesEditor from './SequencePosesEditor.svelte';
    import ContentEditor from './ContentEditor.svelte';
    import PlaceEditor from './PlaceEditor.svelte';
    import ConceptLinkUI from '../concepts/ConceptLinkUI.svelte';
    import { getConceptIndex } from '../project/Contexts';
    import { DB, locales } from '../../db/Database';
    import { tick } from 'svelte';
    import { DOCUMENTATION_SYMBOL, EDIT_SYMBOL } from '../../parser/Symbols';
    import MotionEditor from './MotionEditor.svelte';
    import PlacementEditor from './PlacementEditor.svelte';
    import NamedControl from './NamedControl.svelte';
    // import AuraEditor from './AuraEditor.svelte';

    export let project: Project;
    export let property: OutputProperty;
    export let values: OutputPropertyValueSet;
    export let editable: boolean;

    let index = getConceptIndex();
    $: bind = values.getBind();
    $: bindConcept = bind ? $index?.getBindConcept(bind) : undefined;
    $: valuesAreSet = values.areSet();

    let toggleView: HTMLButtonElement | undefined;

    async function toggleValues(set: boolean) {
        if (set) values.set(DB, project, $locales);
        else values.unset(DB, project, $locales);
        // Preserve focus on toggle button after setting.
        await tick();
        toggleView?.focus();
    }
</script>

<NamedControl>
    <svelte:fragment slot="name">
        {#if bindConcept}<small
                ><ConceptLinkUI
                    link={bindConcept}
                    label={DOCUMENTATION_SYMBOL}
                /></small
            >{/if}
        <label for={property.getName()}
            >{bindConcept?.getName($locales[0], false) ?? '—'}</label
        >
        {#if editable}
            <Button
                tip={valuesAreSet
                    ? $locales[0].ui.palette.button.revert
                    : $locales[0].ui.palette.button.set}
                bind:view={toggleView}
                action={() => toggleValues(!valuesAreSet)}
                >{valuesAreSet ? '⨉' : EDIT_SYMBOL}</Button
            >{/if}
    </svelte:fragment>
    <svelte:fragment slot="control">
        {#if values.areMixed()}
            <Note>{$locales[0].ui.palette.labels.mixed}</Note>
            {bindConcept?.getName($locales[0], false) ?? '—'}
        {/if}
        {#if editable}
            <Button
                tip={valuesAreSet
                    ? $locales[0].ui.palette.button.revert
                    : $locales[0].ui.palette.button.set}
                bind:view={toggleView}
                action={() => toggleValues(!valuesAreSet)}
                >{valuesAreSet ? '⨉' : EDIT_SYMBOL}</Button
            >{/if}
        <div class="control">
            {#if property.type === 'aura'}
                <!-- <div style="background-color:hotpink">
                <h2>AURA EDITOR</h2>
            </div> -->
            {:else if values.areMixed()}
                <Note
                    >{$locales
                        .map((locale) => locale.ui.palette.labels.mixed)
                        .join('/')}</Note
                >
            {:else if !values.areSet()}
                {@const expression = values.getExpression()}
                <!-- If the values arent set, show as inherited if inherited, and otherwise show the default -->
                <Note
                    >{#if property.inherited}{$locales[0].ui.palette.labels
                            .inherited}{:else if values.areDefault() && expression !== undefined}<NodeView
                            node={expression}
                        />
                        {$locales[0].ui.palette.labels
                            .default}{:else}&mdash;{/if}</Note
                >
            {:else if !values.areEditable(project)}
                <Note>{$locales[0].ui.palette.labels.computed}</Note>
            {:else if property.type instanceof OutputPropertyRange}
                <BindSlider
                    {property}
                    {values}
                    range={property.type}
                    {editable}
                />
            {:else if property.type instanceof OutputPropertyOptions}
                <BindOptions
                    {property}
                    {values}
                    options={property.type}
                    {editable}
                />
            {:else if property.type instanceof OutputPropertyText}
                <BindText
                    {property}
                    {values}
                    validator={property.type.validator}
                    {editable}
                />
            {:else if property.type === 'color'}
                <BindColor {property} {values} {editable} />
            {:else if property.type === 'bool'}
                <BindCheckbox {property} {values} {editable} />
            {:else if property.type === 'pose'}
                {@const expression = values.getExpression()}
                {#if expression instanceof Evaluate && expression.is(project.shares.output.Pose, project.getNodeContext(expression))}
                    <PoseEditor
                        {project}
                        outputs={values.getOutputExpressions(project, $locales)}
                        sequence={false}
                        {editable}
                    />
                {:else if expression instanceof Evaluate && expression.is(project.shares.output.Sequence, project.getNodeContext(expression))}
                    <SequenceEditor
                        {project}
                        outputs={values.getOutputExpressions(project, $locales)}
                        {editable}
                    />
                {/if}
            {:else if property.type == 'poses'}
                <SequencePosesEditor
                    {project}
                    map={values.getMap()}
                    {editable}
                />
            {:else if property.type === 'content'}
                <ContentEditor {project} list={values.getList()} {editable} />
            {:else if property.type === 'place'}
                {@const place = values.getEvaluationOf(
                    project,
                    project.shares.output.Place,
                )}
                {@const motion = values.getEvaluationOf(
                    project,
                    project.shares.input.Motion,
                )}
                {@const placement = values.getEvaluationOf(
                    project,
                    project.shares.input.Placement,
                )}
                {#if place}
                    <PlaceEditor
                        {project}
                        {place}
                        {editable}
                        convertable={true}
                    />
                {:else if motion}
                    <MotionEditor {project} {motion} {editable} />
                {:else if placement}
                    <PlacementEditor {project} {placement} {editable} />
                {/if}
            {/if}
        </div></svelte:fragment
    >
</NamedControl>

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
        flex-basis: 5em;
        text-align: left;
        margin: 0;
        white-space: nowrap;
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
