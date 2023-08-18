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
    import { DB, locale, locales } from '../../db/Database';
    import { tick } from 'svelte';

    export let project: Project;
    export let property: OutputProperty;
    export let values: OutputPropertyValueSet;

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

<div class="property">
    <h3 class="name"
        >{#if bindConcept}<ConceptLinkUI
                link={bindConcept}
            />{:else}&mdash;{/if}</h3
    >
    <Button
        tip={valuesAreSet
            ? $locale.ui.description.revert
            : $locale.ui.description.set}
        bind:view={toggleView}
        action={() => toggleValues(!valuesAreSet)}
        >{valuesAreSet ? '⨉' : '✎'}</Button
    >
    <div class="control">
        {#if values.areMixed()}
            <Note
                >{$locales
                    .map((locale) => locale.ui.labels.mixed)
                    .join('/')}</Note
            >
        {:else if !values.areSet()}
            {@const expression = values.getExpression()}
            <!-- If the values arent set, show as inherited if inherited, and otherwise show the default -->
            <Note
                >{#if property.inherited}{$locales
                        .map((locale) => locale.ui.labels.inherited)
                        .join(
                            '/'
                        )}{:else if values.areDefault() && expression !== undefined}<NodeView
                        node={expression}
                    />
                    {$locales
                        .map((locale) => locale.ui.labels.default)
                        .join('/')}{:else}&mdash;{/if}</Note
            >
        {:else if !values.areEditable(project)}
            <Note>{$locales.map((locale) => locale.ui.labels.computed)}</Note>
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
            {#if expression instanceof Evaluate && expression.is(project.shares.output.Pose, project.getNodeContext(expression))}
                <PoseEditor
                    {project}
                    outputs={values.getOutputExpressions(project)}
                    sequence={false}
                />
            {:else if expression instanceof Evaluate && expression.is(project.shares.output.Sequence, project.getNodeContext(expression))}
                <SequenceEditor
                    {project}
                    outputs={values.getOutputExpressions(project)}
                />
            {/if}
        {:else if property.type == 'poses'}
            <SequencePosesEditor {project} map={values.getMap()} />
        {:else if property.type === 'content'}
            <ContentEditor {project} list={values.getList()} />
        {:else if property.type === 'place'}
            <PlaceEditor {project} place={values.getPlace(project)} />
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
        flex-basis: 5em;
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
