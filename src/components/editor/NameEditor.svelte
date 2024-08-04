<script lang="ts">
    import TextField from '@components/widgets/TextField.svelte';
    import { Projects } from '@db/Database';
    import Sym from '@nodes/Sym';
    import { toTokens } from '@parser/toTokens';
    import Name from '@nodes/Name';
    import type Project from '@models/Project';

    export let name: Name;
    export let project: Project;
    export let text: string;
    export let placeholder: string;
</script>

<TextField
    {text}
    id={name.name.id}
    classes={['token-editor']}
    placeholder={placeholder ?? ''}
    description={placeholder ?? ''}
    validator={(newName) => {
        const tokens = toTokens(newName);
        return (
            tokens.remaining() === 2 &&
            tokens.nextIsOneOf(Sym.Name, Sym.Placeholder)
        );
    }}
    changed={(newName) =>
        newName !== name.getName()
            ? Projects.revise(project, [[name, Name.make(newName)]])
            : undefined}
></TextField>
