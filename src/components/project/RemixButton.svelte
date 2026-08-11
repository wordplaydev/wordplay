<script lang="ts">
    import { goto } from '$app/navigation';
    import Button from '@components/widgets/Button.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { Projects } from '@db/projects/Projects';
    import type Project from '@db/projects/Project';
    import { REMIX_SYMBOL } from '@parser/Symbols';

    interface Props {
        project: Project;
    }

    let { project }: Props = $props();

    /** Delegate to the database so provenance and the name-collision suffix are
     *  decided in one place, rather than here and in the project lists too. */
    function remix() {
        goto(Projects.remix(project).getLink(false));
    }
</script>

<Button
    tip={(l) => l.ui.project.button.remix.tip}
    action={remix}
    icon={REMIX_SYMBOL}
    background="salient"
    ><LocalizedText path={(l) => l.ui.project.button.remix.label} /></Button
>
