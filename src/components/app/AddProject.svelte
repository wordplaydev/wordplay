<script lang="ts">
    import Spinning from '@components/app/Spinning.svelte';
    import Button from '@components/widgets/Button.svelte';
    import { locales } from '@db/Database';
    import Project from '@db/projects/Project';
    import Source from '@nodes/Source';

    interface Props {
        add: (newProject: Project) => void;
    }

    let { add }: Props = $props();

    let creating = $state(false);

    async function newProject() {
        creating = true;
        add(
            Project.make(
                null,
                '',
                new Source(
                    $locales.getUnannotatedText((l) => l.term.start),
                    $locales.getUnannotatedText(
                        (l) => l.ui.project.defaults.starterCode,
                    ),
                ),
                [],
                $locales.getLocales(),
            ),
        );
    }
</script>

<p class="add">
    {#if creating}
        <Spinning />
    {:else}
        <Button
            tip={(l) => l.ui.page.projects.button.newproject}
            action={newProject}
            testid="addproject"
            large
            icon="+"
        ></Button>
    {/if}</p
>
