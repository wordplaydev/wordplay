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
    import { DB, locale } from '../../db/Database';

    export let project: Project;
    export let list: ListLiteral | undefined;
    export let editable: boolean;

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
                    tip={$locale.ui.description.removeContent}
                    action={() =>
                        list
                            ? removeContent(DB, project, list, index)
                            : undefined}
                    active={editable && list.values.length > 0}>⨉</Button
                >
                <Button
                    tip={$locale.ui.description.moveContentUp}
                    action={() =>
                        list
                            ? moveContent(DB, project, list, index, -1)
                            : undefined}
                    active={editable && index > 0}>↑</Button
                >
                <Button
                    tip={$locale.ui.description.moveContentDown}
                    action={() =>
                        list
                            ? moveContent(DB, project, list, index, 1)
                            : undefined}
                    active={editable && index < list.values.length - 1}
                    >↓</Button
                >
                <Button
                    tip={$locale.ui.description.editContent}
                    active={editable}
                    action={() => editContent(index)}>✎</Button
                >
                <RootView node={content} localized />
            </div>
        {/each}
        <div class="add">
            <Button
                tip={$locale.ui.description.addPhrase}
                active={editable}
                action={() =>
                    list
                        ? addContent(
                              DB,
                              project,
                              list,
                              list?.values.length ?? 1 - 1,
                              true
                          )
                        : undefined}
                >+{project.shares.output.Phrase.getNames()[0]}</Button
            >
            <Button
                tip={$locale.ui.description.addGroup}
                active={editable}
                action={() =>
                    list
                        ? addContent(
                              DB,
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
        <Note>{$locale.ui.labels.computed}</Note>
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
