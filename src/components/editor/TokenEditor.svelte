<script lang="ts">
    import TextField from '@components/widgets/TextField.svelte';
    import type Project from '@models/Project';
    import Token from '@nodes/Token';
    import { getCaret } from '@components/project/Contexts';
    import { Projects } from '@db/Database';
    import { tick } from 'svelte';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';

    export let token: Token;
    export let project: Project;
    export let text: string;
    export let placeholder: string;
    export let validator: ((text: string) => boolean) | undefined;
    export let creator: (text: string) => Token | [Token, Project];

    let view: HTMLInputElement | undefined = undefined;
    const caret = getCaret();

    function handleChange(newName: string) {
        if (newName !== token.getText()) {
            let newToken;
            let newProject;
            const revision = creator(newName);
            if (Array.isArray(revision)) {
                [newToken, newProject] = revision;
                Projects.reviseProject(newProject);
            } else {
                newToken = revision;
                Projects.revise(project, [[token, revision]]);
            }

            if (caret && $caret) {
                caret.set($caret.withPosition(newToken).withAddition(newToken));
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

                        if (
                            widget instanceof HTMLInputElement &&
                            previousIndex !== undefined
                        ) {
                            widget.setSelectionRange(
                                previousIndex,
                                previousIndex,
                            );
                        }
                    }
                }
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
