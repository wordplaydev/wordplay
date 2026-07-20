<script lang="ts">
    import { goto } from '$app/navigation';
    import { getUser } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { Projects } from '@db/Database';
    import type Project from '@db/projects/Project';
    import { PersistenceType } from '@db/projects/ProjectHistory.svelte';
    import { COPY_SYMBOL } from '@parser/Symbols';

    interface Props {
        project: Project;
    }

    let { project }: Props = $props();

    const user = getUser();

    /** Copy the project, make it private, track it, then gotoProject(). */
    function copy() {
        const copy = project.copy($user?.uid ?? null);
        Projects.track(copy, true, PersistenceType.Online, false);
        goto(copy.getLink(false));
    }
</script>

<Button
    tip={(l) => l.ui.project.button.duplicate.tip}
    action={copy}
    icon={COPY_SYMBOL}
    background="salient"
    ><LocalizedText path={(l) => l.ui.project.button.duplicate.label} /></Button
>
