<script lang="ts">
    import { goto } from '$app/navigation';
    import Button from '@components/widgets/Button.svelte';
    import { locales, Projects } from '@db/Database';
    import type Project from '@db/projects/Project';
    import { PersistenceType } from '@db/projects/ProjectHistory.svelte';
    import { COPY_SYMBOL } from '@parser/Symbols';
    import { getUser } from './Contexts';

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
    tip={$locales.get((l) => l.ui.project.button.duplicate)}
    action={copy}
    icon={COPY_SYMBOL}
    ><span class="copy">
        {$locales.get((l) => l.ui.project.button.duplicate)}</span
    ></Button
>

<style>
    .copy {
        display: inline-block;
        background: var(--wordplay-highlight-color);
        color: var(--wordplay-background);
        border-radius: var(--wordplay-border-radius);
        padding-inline-start: var(--wordplay-spacing);
        padding-inline-end: var(--wordplay-spacing);
        user-select: none;
    }
</style>
