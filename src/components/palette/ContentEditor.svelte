<script lang="ts">
    import type Project from '@models/Project';
    import Evaluate from '@nodes/Evaluate';
    import type Expression from '@nodes/Expression';
    import Button from '../widgets/Button.svelte';
    import {
        preferredLanguages,
        preferredTranslations,
    } from '@translation/translations';
    import Note from '../widgets/Note.svelte';
    import ListLiteral from '@nodes/ListLiteral';
    import { GroupType } from '@output/Group';
    import { PhraseType } from '@output/Phrase';
    import TextLiteral from '@nodes/TextLiteral';
    import Reference from '@nodes/Reference';
    import { RowType } from '@output/Row';
    import RootView from '../project/RootView.svelte';
    import {
        getProjects,
        getSelectedOutputPaths,
        setSelectedOutput,
    } from '../project/Contexts';

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

    function addContent(index: number, phrase: boolean) {
        if (list === undefined) return;
        const newPhrase = Evaluate.make(
            Reference.make(
                PhraseType.names.getTranslation($preferredLanguages)
            ),
            [TextLiteral.make($preferredTranslations[0].welcome)]
        );
        revise([
            ...list.values.slice(0, index + 1),
            phrase
                ? newPhrase
                : // Create a group with a Row layout and a single phrase
                  Evaluate.make(
                      Reference.make(
                          GroupType.names.getTranslation($preferredLanguages)
                      ),
                      [
                          Evaluate.make(
                              Reference.make(
                                  RowType.names.getTranslation(
                                      $preferredLanguages
                                  )
                              ),
                              []
                          ),
                          ListLiteral.make([newPhrase]),
                      ]
                  ),
            ...list.values.slice(index + 1),
        ]);
    }

    function removeContent(index: number) {
        if (list === undefined) return;
        revise([
            ...list.values.slice(0, index),
            ...list.values.slice(index + 1),
        ]);
    }
    function moveContent(index: number, direction: 1 | -1) {
        if (list === undefined) return;
        const kv = list.values[index];
        if (kv === undefined) return;
        const newValues = list.values.slice();
        if (direction < 0) {
            const previous = newValues[index - 1];
            newValues[index - 1] = kv;
            newValues[index] = previous;
        } else {
            const next = newValues[index + 1];
            newValues[index + 1] = kv;
            newValues[index] = next;
        }
        revise(newValues);
    }

    function editContent(index: number) {
        if (list === undefined || selectedOutputPaths === undefined) return;

        const item = list.values[index];
        if (item instanceof Evaluate)
            setSelectedOutput(selectedOutputPaths, project, [item]);
    }

    function revise(newValues: Expression[]) {
        if (list)
            $projects.reviseNodes(project, [
                [list, ListLiteral.make(newValues)],
            ]);
    }
</script>

<div class="list">
    {#if list && valid}
        {#each list.values as content, index}
            <div class="content">
                <Button
                    tip={$preferredTranslations[0].ui.tooltip.removeContent}
                    action={() => removeContent(index)}
                    enabled={list.values.length > 1}>⨉</Button
                >
                <Button
                    tip={$preferredTranslations[0].ui.tooltip.moveContentUp}
                    action={() => moveContent(index, -1)}
                    enabled={index > 0}>↑</Button
                >
                <Button
                    tip={$preferredTranslations[0].ui.tooltip.moveContentDown}
                    action={() => moveContent(index, 1)}
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
                action={() => addContent(list?.values.length ?? 1 - 1, true)}
                >+ {PhraseType.getNames()[0]}</Button
            >
            <Button
                tip={$preferredTranslations[0].ui.tooltip.addGroup}
                action={() => addContent(list?.values.length ?? 1 - 1, false)}
                >+ {GroupType.getNames()[0]}</Button
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
