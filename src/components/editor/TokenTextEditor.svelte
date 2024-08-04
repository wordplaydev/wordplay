<script lang="ts">
    import TextField from '@components/widgets/TextField.svelte';
    import type Project from '@models/Project';
    import Token from '@nodes/Token';
    import { getCaret } from '@components/project/Contexts';
    import { Projects } from '@db/Database';

    export let token: Token;
    export let project: Project;
    export let text: string;
    export let placeholder: string;
    export let validator: ((text: string) => boolean) | undefined;
    export let creator: (text: string) => Token;

    const caret = getCaret();
</script>

<TextField
    {text}
    id={token.id}
    classes={['token-editor']}
    placeholder={placeholder ?? ''}
    description={placeholder ?? ''}
    {validator}
    changed={(newName) => {
        if (newName !== token.getText()) {
            const revisedToken = creator(newName);
            Projects.revise(project, [[token, revisedToken]]);
            if (caret && $caret) {
                caret.set(
                    $caret
                        .withPosition(revisedToken)
                        .withAddition(revisedToken),
                );
            }
        }
    }}
></TextField>
