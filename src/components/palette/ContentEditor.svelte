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
    import { config } from '../../db/Database';

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
                    project.shares.output.Phrase,
                    project.getNodeContext(value)
                ) ||
                    value.is(
                        project.shares.output.Group,
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
                    tip={$config.getLocale().ui.description.removeContent}
                    action={() =>
                        list
                            ? removeContent($config, project, list, index)
                            : undefined}
                    active={list.values.length > 0}>⨉</Button
                >
                <Button
                    tip={$config.getLocale().ui.description.moveContentUp}
                    action={() =>
                        list
                            ? moveContent($config, project, list, index, -1)
                            : undefined}
                    active={index > 0}>↑</Button
                >
                <Button
                    tip={$config.getLocale().ui.description.moveContentDown}
                    action={() =>
                        list
                            ? moveContent($config, project, list, index, 1)
                            : undefined}
                    active={index < list.values.length - 1}>↓</Button
                >
                <Button
                    tip={$config.getLocale().ui.description.editContent}
                    action={() => editContent(index)}>✎</Button
                >
                <RootView node={content} localized />
            </div>
        {/each}
        <div class="add">
            <Button
                tip={$config.getLocale().ui.description.addPhrase}
                action={() =>
                    list
                        ? addContent(
                              $config,
                              project,
                              list,
                              list?.values.length ?? 1 - 1,
                              true
                          )
                        : undefined}
                >+{project.shares.output.Phrase.getNames()[0]}</Button
            >
            <Button
                tip={$config.getLocale().ui.description.addGroup}
                action={() =>
                    list
                        ? addContent(
                              $config,
                              project,
                              list,
                              list?.values.length ?? 1 - 1,
                              false
                          )
                        : undefined}
                >+{project.shares.output.Group.getNames()[0]}</Button
            ></div
        >
    {:else}
        <Note>{$config.getLocale().ui.labels.computed}</Note>
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
