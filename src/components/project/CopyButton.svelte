<script lang="ts">
    import { goto } from '$app/navigation';
    import Button from '@components/widgets/Button.svelte';
    import { locales, Projects } from '@db/Database';
    import { PersistenceType } from '@db/ProjectHistory';
    import type Project from '@models/Project';
    import { COPY_SYMBOL } from '@parser/Symbols';

    export let project: Project;

    /** Copy the project, make it private, track it, then gotoProject(). */
    function copy() {
        const copy = project.copy().asPublic(false);
        Projects.track(copy, true, PersistenceType.Online, false);
        goto(copy.getLink(false));
    }
</script>

<Button tip={$locales.get((l) => l.ui.project.button.duplicate)} action={copy}
    ><span class="copy"
        >{COPY_SYMBOL}
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
