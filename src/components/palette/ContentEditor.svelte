<script lang="ts">
    import type Project from '@models/Project';
    import Evaluate from '@nodes/Evaluate';
    import Button from '../widgets/Button.svelte';
    import { preferredTranslations } from '@translation/translations';
    import Note from '../widgets/Note.svelte';
    import { GroupType } from '@output/Group';
    import { PhraseType } from '@output/Phrase';
    import RootView from '../project/RootView.svelte';
    import {
        getProjects,
        getSelectedOutputPaths,
        setSelectedOutput,
    } from '../project/Contexts';
    import { addContent, moveContent, removeContent } from './editOutput';
    import type ListLiteral from '../../nodes/ListLiteral';

    export let project: Project;
    export let list: ListLiteral | undefined;

    const projects = getProjects();
    const selectedOutputPaths = getSelectedOutputPaths();

    // Get the map from the value set, unless its not a valid sequence or the maps of the selections aren't equal.
    $: valid =
        list !== undefined &&
        list.values.every(
            (value) =>
                value instanceof Evaluate &&
                (value.is(PhraseType, project.getNodeContext(value)) ||
                    value.is(GroupType, project.getNodeContext(value)))
        );

    function editContent(index: number) {
        if (list === undefined || selectedOutputPaths === undefined) return;

        const item = list.values[index];
        if (item instanceof Evaluate)
            setSelectedOutput(selectedOutputPaths, project, [item]);
    }
</script>

<div class="list">
    {#if list && valid}
        {#each list.values as content, index}
            <div class="content">
                <Button
                    tip={$preferredTranslations[0].ui.tooltip.removeContent}
                    action={() =>
                        list
                            ? removeContent($projects, project, list, index)
                            : undefined}
                    enabled={list.values.length > 0}>⨉</Button
                >
                <Button
                    tip={$preferredTranslations[0].ui.tooltip.moveContentUp}
                    action={() =>
                        list
                            ? moveContent($projects, project, list, index, -1)
                            : undefined}
                    enabled={index > 0}>↑</Button
                >
                <Button
                    tip={$preferredTranslations[0].ui.tooltip.moveContentDown}
                    action={() =>
                        list
                            ? moveContent($projects, project, list, index, 1)
                            : undefined}
                    enabled={index < list.values.length - 1}>↓</Button
                >
                <Button
                    tip={$preferredTranslations[0].ui.tooltip.editContent}
                    action={() => editContent(index)}>✎</Button
                >
                <RootView node={content} />
            </div>
        {/each}
        <div class="add">
            <Button
                tip={$preferredTranslations[0].ui.tooltip.addPhrase}
                action={() =>
                    list
                        ? addContent(
                              $projects,
                              project,
                              list,
                              list?.values.length ?? 1 - 1,
                              true
                          )
                        : undefined}>+{PhraseType.getNames()[0]}</Button
            >
            <Button
                tip={$preferredTranslations[0].ui.tooltip.addGroup}
                action={() =>
                    list
                        ? addContent(
                              $projects,
                              project,
                              list,
                              list?.values.length ?? 1 - 1,
                              false
                          )
                        : undefined}>+{GroupType.getNames()[0]}</Button
            ></div
        >
    {:else}
        <Note>{$preferredTranslations[0].ui.labels.computed}</Note>
    {/if}
</div>

<style>
    .list {
        display: flex;
        flex-direction: column;
        flex-wrap: nowrap;
        gap: var(--wordplay-spacing);
    }

    .content {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        gap: var(--wordplay-spacing);
        align-items: baseline;
    }
</style>
