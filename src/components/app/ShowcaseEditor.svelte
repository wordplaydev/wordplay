<!--
    The landing showcase's code, editable in place. A component of its own because
    the editor needs a command context bound to the stage's evaluator, and contexts
    can only be set once that evaluator exists — which is after PlayView mounts.
-->
<script lang="ts">
    import {
        setExampleConceptIndex,
        type default as EditableExample,
    } from '#components/concepts/EditableExample.svelte.ts';
    import type { CommandContext } from '#components/editor/commands/Commands.ts';
    import Editor from '#components/editor/Editor.svelte';
    import FloatingMenu from '#components/editor/menu/FloatingMenu.svelte';
    import {
        setConflicts,
        setEditors,
        setProjectCommandContext,
        type EditorState,
    } from '#components/project/Contexts.ts';
    import { blocks, DB, locales } from '#db/Database.ts';
    import type Project from '#db/projects/Project.ts';
    import type Caret from '#edit/caret/Caret.ts';
    import type MenuInfo from '#edit/menu/Menu.ts';
    import type Evaluator from '#runtime/Evaluator.ts';
    import { writable } from 'svelte/store';

    interface Props {
        project: Project;
        evaluator: Evaluator;
        example: EditableExample;
    }

    let { project, evaluator, example }: Props = $props();

    let caret: Caret | undefined = $state(undefined);

    // Autocomplete and nearly every blocks control open this menu, which a
    // project would show; here the floating host does.
    let menu: MenuInfo | undefined = $state(undefined);
    let scope: HTMLElement | undefined = $state(undefined);
    setExampleConceptIndex(
        () => project,
        () => $locales,
    );

    // The editor publishes its state, focus included, only into an editors map;
    // without one its caret never learns it is focused and stays dim.
    setEditors(writable(new Map<string, EditorState>()));

    // So an edit that breaks the program says why, as it would in a project.
    const conflicts = writable<ReturnType<Project['analyze']>['conflicts']>([]);
    setConflicts(conflicts);
    $effect(() => {
        conflicts.set(project.analyze().conflicts);
    });

    // The commands the editor dispatches act on this example, not on some
    // project elsewhere; project-shell actions are left undefined, as ExampleUI does.
    let context = $derived<CommandContext>({
        caret,
        editor: true,
        project,
        locales: $locales,
        evaluator,
        database: DB,
        dragging: false,
        blocks: $blocks,
        view: undefined,
        zoom: undefined,
    });
    // svelte-ignore state_referenced_locally
    let contextState = $state({ context });
    setProjectCommandContext(contextState);
    $effect(() => {
        contextState.context = context;
    });
</script>

<div class="scope" bind:this={scope}>
    <Editor
        source={project.getMain()}
        {project}
        {evaluator}
        locale={null}
        autofocus={false}
        editable={example.editing}
        requestEditable={example.edit}
        bind:caretSnapshot={caret}
        bind:menu
    />
</div>
<FloatingMenu bind:menu {scope} />

<style>
    .scope {
        display: contents;
    }
</style>
