<script lang="ts">
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { blocks, DB } from '@db/Database';
    import type Project from '@db/projects/Project';
    import Evaluate from '@nodes/Evaluate';
    import type ListLiteral from '../../nodes/ListLiteral';
    import { CANCEL_SYMBOL, EDIT_SYMBOL } from '../../parser/Symbols';
    import { getSelectedOutput } from '../project/Contexts';
    import RootView from '../project/RootView.svelte';
    import Button from '../widgets/Button.svelte';
    import Note from '../widgets/Note.svelte';
    import { addContent, moveContent, removeContent } from './editOutput';

    interface Props {
        project: Project;
        list: ListLiteral | undefined;
        editable: boolean;
        id?: string | undefined;
    }

    let { project, list, editable, id = undefined }: Props = $props();

    const selection = getSelectedOutput();

    // Get the map from the value set, unless its not a valid sequence or the maps of the selections aren't equal.
    let valid = $derived(
        list !== undefined &&
            list.values.every(
                (value) =>
                    value instanceof Evaluate &&
                    (value.is(
                        project.shares.output.Phrase,
                        project.getNodeContext(value),
                    ) ||
                        value.is(
                            project.shares.output.Group,
                            project.getNodeContext(value),
                        ) ||
                        value.is(
                            project.shares.output.Shape,
                            project.getNodeContext(value),
                        )),
            ),
    );

    function editContent(index: number) {
        if (list === undefined) return;

        const item = list.values[index];
        if (item instanceof Evaluate && selection)
            selection.setPaths(project, [item], 'palette');
    }
</script>

<div class="list" {id}>
    {#if list && valid}
        {#each list.values as content, index}
            <div class="content">
                <Button
                    tip={(l) => l.ui.palette.button.remove}
                    action={() =>
                        list
                            ? removeContent(DB, project, list, index)
                            : undefined}
                    active={editable && list.values.length > 0}
                    icon={CANCEL_SYMBOL}
                ></Button>
                <Button
                    tip={(l) => l.ui.palette.button.up}
                    action={() =>
                        list
                            ? moveContent(DB, project, list, index, -1)
                            : undefined}
                    active={editable && index > 0}
                    icon="↑"
                ></Button>
                <Button
                    tip={(l) => l.ui.palette.button.down}
                    action={() =>
                        list
                            ? moveContent(DB, project, list, index, 1)
                            : undefined}
                    active={editable && index < list.values.length - 1}
                    icon="↓"
                ></Button>
                <Button
                    tip={(l) => l.ui.palette.button.edit}
                    active={editable}
                    action={() => editContent(index)}
                    icon={EDIT_SYMBOL}
                ></Button>
                <RootView node={content} locale="symbolic" blocks={$blocks} />
            </div>
        {/each}
        <div class="add">
            <Button
                tip={(l) => l.ui.palette.button.addPhrase}
                active={editable}
                action={() =>
                    list
                        ? addContent(
                              DB,
                              project,
                              list,
                              list?.values.length ?? 1 - 1,
                              'phrase',
                          )
                        : undefined}
                >+{project.shares.output.Phrase.getNames()[0]}</Button
            >
            <Button
                tip={(l) => l.ui.palette.button.addGroup}
                active={editable}
                action={() =>
                    list
                        ? addContent(
                              DB,
                              project,
                              list,
                              list?.values.length ?? 1 - 1,
                              'group',
                          )
                        : undefined}
                >+{project.shares.output.Group.getNames()[0]}</Button
            >
            <Button
                tip={(l) => l.ui.palette.button.addShape}
                active={editable}
                action={() =>
                    list
                        ? addContent(
                              DB,
                              project,
                              list,
                              list?.values.length ?? 1 - 1,
                              'shape',
                          )
                        : undefined}
                >+{project.shares.output.Shape.getNames()[0]}</Button
            ></div
        >
    {:else}
        <Note><LocalizedText path={(l) => l.ui.palette.labels.computed} /></Note
        >
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
