<script lang="ts">
    import TextField from '@components/widgets/TextField.svelte';
    import type Project from '@models/Project';
    import Token from '@nodes/Token';
    import { getCaret, getEditor } from '@components/project/Contexts';
    import { Projects } from '@db/Database';
    import { tick } from 'svelte';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';

    export let token: Token;
    export let project: Project;
    export let text: string;
    export let placeholder: string;
    export let validator: ((text: string) => boolean) | undefined;
    export let creator: (text: string) => Token | [Token, Project] | undefined;

    let view: HTMLInputElement | undefined = undefined;
    const caret = getCaret();
    const editor = getEditor();

    function handleChange(newName: string) {
        if (newName !== token.getText()) {
            let newToken;
            let newProject;
            const revision = creator(newName);

            const source = project.getSourceOf(token);
            if (source === undefined) return;
            const sourceIndex = project.getIndexOfSource(source);

            if (Array.isArray(revision)) {
                [newToken, newProject] = revision;
                Projects.reviseProject(newProject);
            }
            // Just a token?
            else if (revision) {
                newToken = revision;
                newProject = Projects.revise(project, [[token, revision]]);
            }
            // Nothing? Remove the token.
            else {
                newToken = undefined;
                newProject = Projects.revise(project, [[token, undefined]]);
            }

            if (caret && $caret && newProject) {
                const newSource = newProject.getSourceWithIndex(sourceIndex);
                if (newSource === undefined) return;
                const newPosition =
                    newToken ??
                    project.getSourceOf(token)?.getTokenTextPosition(token) ??
                    0;
                caret.set(
                    $caret
                        .withPosition(newPosition)
                        .withSource(newSource)
                        .withAddition(newToken),
                );
            }

            let previousIndex = view?.selectionStart;

            tick().then(() => {
                // Find the view associated with this token editor and focus on it.
                if (
                    $caret !== undefined &&
                    $caret.isNode() &&
                    $caret.position === newToken
                ) {
                    const token = $caret.position;
                    const widget = document.querySelector(
                        `.token-editor[data-id="${token.id}"]`,
                    );
                    if (widget instanceof HTMLElement) {
                        setKeyboardFocus(
                            widget,
                            'Focusing token editor after caret or focus change',
                        );

                        // Did we find it? Set it.
                        if (
                            widget instanceof HTMLInputElement &&
                            previousIndex !== undefined
                        ) {
                            widget.setSelectionRange(
                                previousIndex,
                                previousIndex,
                            );
                        }
                        // Otherwise, focus the editor.
                        else
                            $editor?.grabFocus(
                                'Token editor lost, focusing editor',
                            );
                    }
                }
                // Otherwise, focus the editor.
                else $editor?.grabFocus('Token editor lost, focusing editor');
            });
        }
    }
</script>

<TextField
    bind:text
    id={token.id}
    bind:view
    classes={['token-editor']}
    placeholder={placeholder ?? ''}
    description={placeholder ?? ''}
    {validator}
    done={(newText) => {
        // Not valid but losing focus? Restore the old text.
        if (validator !== undefined && validator(newText) === false) {
            text = token.getText();
        }
    }}
    changed={handleChange}
></TextField>
