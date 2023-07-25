<script lang="ts">
    import type Project from '@models/Project';
    import Evaluate from '@nodes/Evaluate';
    import Button from '../widgets/Button.svelte';
    import Note from '../widgets/Note.svelte';
    import RootView from '../project/RootView.svelte';
    import {
        getSelectedOutputPaths,
        setSelectedOutput,
    } from '../project/Contexts';
    import { addContent, moveContent, removeContent } from './editOutput';
    import type ListLiteral from '../../nodes/ListLiteral';
    import { creator } from '../../db/Creator';

    export let project: Project;
    export let list: ListLiteral | undefined;

    const selectedOutputPaths = getSelectedOutputPaths();

    // Get the map from the value set, unless its not a valid sequence or the maps of the selections aren't equal.
    $: valid =
        list !== undefined &&
        list.values.every(
            (value) =>
                value instanceof Evaluate &&
                (value.is(
                    project.shares.output.phrase,
                    project.getNodeContext(value)
                ) ||
                    value.is(
                        project.shares.output.group,
                        project.getNodeContext(value)
                    ))
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
                    tip={$creator.getLocale().ui.description.removeContent}
                    action={() =>
                        list
                            ? removeContent($creator, project, list, index)
                            : undefined}
                    active={list.values.length > 0}>⨉</Button
                >
                <Button
                    tip={$creator.getLocale().ui.description.moveContentUp}
                    action={() =>
                        list
                            ? moveContent($creator, project, list, index, -1)
                            : undefined}
                    active={index > 0}>↑</Button
                >
                <Button
                    tip={$creator.getLocale().ui.description.moveContentDown}
                    action={() =>
                        list
                            ? moveContent($creator, project, list, index, 1)
                            : undefined}
                    active={index < list.values.length - 1}>↓</Button
                >
                <Button
                    tip={$creator.getLocale().ui.description.editContent}
                    action={() => editContent(index)}>✎</Button
                >
                <RootView node={content} localized />
            </div>
        {/each}
        <div class="add">
            <Button
                tip={$creator.getLocale().ui.description.addPhrase}
                action={() =>
                    list
                        ? addContent(
                              $creator,
                              project,
                              list,
                              list?.values.length ?? 1 - 1,
                              true
                          )
                        : undefined}
                >+{project.shares.output.phrase.getNames()[0]}</Button
            >
            <Button
                tip={$creator.getLocale().ui.description.addGroup}
                action={() =>
                    list
                        ? addContent(
                              $creator,
                              project,
                              list,
                              list?.values.length ?? 1 - 1,
                              false
                          )
                        : undefined}
                >+{project.shares.output.group.getNames()[0]}</Button
            ></div
        >
    {:else}
        <Note>{$creator.getLocale().ui.labels.computed}</Note>
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
