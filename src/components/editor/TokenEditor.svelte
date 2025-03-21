<script lang="ts">
    import { getCaret, getEditor } from '@components/project/Contexts';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import TextField from '@components/widgets/TextField.svelte';
    import { Projects } from '@db/Database';
    import type Project from '@db/projects/Project';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import Token from '@nodes/Token';
    import { tick } from 'svelte';

    interface Props {
        token: Token;
        project: Project;
        text: string;
        description: LocaleTextAccessor;
        placeholder: LocaleTextAccessor | string;
        /** An optional function that returns true or a message to display if not valid. */
        validator: ((text: string) => LocaleTextAccessor | true) | undefined;
        creator: (text: string) => Token | [Token, Project] | undefined;
    }

    let {
        token,
        project,
        text = $bindable(),
        placeholder,
        description,
        validator,
        creator,
    }: Props = $props();

    let view: HTMLInputElement | undefined = $state(undefined);
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
    id="token-editor-{token.id}"
    bind:text
    data={token.id}
    bind:view
    classes={['token-editor']}
    {placeholder}
    {description}
    {validator}
    done={(newText) => {
        // Not valid but losing focus? Restore the old text.
        if (validator !== undefined && validator(newText) !== true) {
            text = token.getText();
        }
    }}
    changed={handleChange}
></TextField>
