<script lang="ts">
    import RootView from '@components/project/RootView.svelte';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import type Project from '@db/projects/Project';
    import type OutputProperty from '@edit/output/OutputProperty';
    import OutputPropertyOptions from '@edit/output/OutputPropertyOptions';
    import OutputPropertyRange from '@edit/output/OutputPropertyRange';
    import OutputPropertyText from '@edit/output/OutputPropertyText';
    import type OutputPropertyValueSet from '@edit/output/OutputPropertyValueSet';
    import Evaluate from '@nodes/Evaluate';
    import { tick } from 'svelte';
    import { DB, locales } from '../../db/Database';
    import {
        CANCEL_SYMBOL,
        DOCUMENTATION_SYMBOL,
        EDIT_SYMBOL,
    } from '../../parser/Symbols';
    import ConceptLinkUI from '../concepts/ConceptLinkUI.svelte';
    import { getConceptIndex } from '../project/Contexts';
    import Button from '../widgets/Button.svelte';
    import Note from '../widgets/Note.svelte';
    import AuraEditor from './AuraEditor.svelte';
    import BindCheckbox from './BindCheckbox.svelte';
    import BindColor from './BindColor.svelte';
    import BindOptions from './BindOptions.svelte';
    import BindSlider from './BindSlider.svelte';
    import BindText from './BindText.svelte';
    import ContentEditor from './ContentEditor.svelte';
    import MotionEditor from './MotionEditor.svelte';
    import NamedControl from './NamedControl.svelte';
    import PlaceEditor from './PlaceEditor.svelte';
    import PlacementEditor from './PlacementEditor.svelte';
    import PoseEditor from './PoseEditor.svelte';
    import SequenceEditor from './SequenceEditor.svelte';
    import SequencePosesEditor from './SequencePosesEditor.svelte';

    interface Props {
        project: Project;
        property: OutputProperty;
        values: OutputPropertyValueSet;
        editable: boolean;
    }

    let { project, property, values, editable }: Props = $props();

    let indexContext = getConceptIndex();
    let index = $derived(indexContext?.index);

    let bind = $derived(values.getBind());
    let bindConcept = $derived(bind ? index?.getBindConcept(bind) : undefined);
    let valuesAreSet = $derived(values.areSet());
    let propertyID = $derived(`property-${property.getName($locales)}`);

    let toggleView: HTMLButtonElement | undefined = $state();

    async function toggleValues(set: boolean) {
        if (set) values.set(DB, project, $locales);
        else values.unset(DB, project, $locales);
        // Preserve focus on toggle button after setting.
        await tick();
        if (toggleView)
            setKeyboardFocus(toggleView, 'Restoring focus after toggle');
    }
</script>

<NamedControl>
    {#snippet name()}
        {#if bindConcept}<small
                ><ConceptLinkUI
                    link={bindConcept}
                    label={DOCUMENTATION_SYMBOL}
                /></small
            >{/if}
        <label for={propertyID}
            >{bindConcept?.getName($locales, false) ?? '—'}</label
        >
        {#if editable}
            <Button
                tip={valuesAreSet
                    ? (l) => l.ui.palette.button.revert
                    : (l) => l.ui.palette.button.set}
                bind:view={toggleView}
                action={() => toggleValues(!valuesAreSet)}
                icon={valuesAreSet ? CANCEL_SYMBOL : EDIT_SYMBOL}
            ></Button>{/if}
    {/snippet}
    {#snippet control()}
        {#if values.areMixed()}
            <Note id={propertyID}
                ><LocalizedText path={(l) => l.ui.palette.labels.mixed} /></Note
            >
        {:else if !values.areSet()}
            {@const expression = values.getExpression()}
            <!-- If the values arent set, show as inherited if inherited, and otherwise show the default -->
            <Note id={propertyID}
                >{#if property.inherited}<LocalizedText
                        path={(l) => l.ui.palette.labels.inherited}
                    />{:else if values.areDefault() && expression !== undefined}
                    <RootView
                        node={expression}
                        inline={true}
                        blocks={false}
                        inert={true}
                    />
                    <LocalizedText
                        path={(l) => l.ui.palette.labels.default}
                    />{:else}&mdash;{/if}</Note
            >
        {:else if !values.areEditable(project)}
            <Note id={propertyID}
                ><LocalizedText
                    path={(l) => l.ui.palette.labels.computed}
                /></Note
            >
        {:else if property.type instanceof OutputPropertyRange}
            <BindSlider
                id={propertyID}
                {property}
                {values}
                range={property.type}
                {editable}
            />
        {:else if property.type instanceof OutputPropertyOptions}
            <BindOptions
                id={propertyID}
                {property}
                {values}
                options={property.type}
                {editable}
            />
        {:else if property.type instanceof OutputPropertyText}
            <BindText
                id={propertyID}
                {property}
                {values}
                validator={property.type.validator}
                {editable}
            />
        {:else if property.type === 'color'}
            <BindColor id={propertyID} {property} {values} {editable} />
        {:else if property.type === 'bool'}
            <BindCheckbox id={propertyID} {property} {values} {editable} />
        {:else if property.type === 'pose'}
            {@const expression = values.getExpression()}
            {#if expression instanceof Evaluate && expression.is(project.shares.output.Pose, project.getNodeContext(expression))}
                <PoseEditor
                    id={propertyID}
                    {project}
                    outputs={values.getOutputExpressions(project, $locales)}
                    sequence={false}
                    {editable}
                />
            {:else if expression instanceof Evaluate && expression.is(project.shares.output.Sequence, project.getNodeContext(expression))}
                <SequenceEditor
                    id={propertyID}
                    {project}
                    outputs={values.getOutputExpressions(project, $locales)}
                    {editable}
                />
            {/if}
        {:else if property.type === 'aura'}
            <AuraEditor {project} {property} {values} {editable} />
        {:else if property.type == 'poses'}
            <SequencePosesEditor
                id={propertyID}
                {project}
                map={values.getMap()}
                {editable}
            />
        {:else if property.type === 'content'}
            <ContentEditor
                id={propertyID}
                {project}
                list={values.getList()}
                {editable}
            />
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
                    id={propertyID}
                    {project}
                    {place}
                    {editable}
                    convertable={true}
                />
            {:else if motion}
                <MotionEditor id={propertyID} {project} {motion} {editable} />
            {:else if placement}
                <PlacementEditor
                    id={propertyID}
                    {project}
                    {placement}
                    {editable}
                />
            {/if}
        {/if}
    {/snippet}
</NamedControl>
