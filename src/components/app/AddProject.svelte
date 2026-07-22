<script lang="ts">
    import Spinning from '@components/app/Spinning.svelte';
    import Button from '@components/widgets/Button.svelte';
    import { locales } from '@db/Database';
    import Project from '@db/projects/Project';
    import Source from '@nodes/Source';

    interface Props {
        add: (newProject: Project) => void;
        /** Whether we know yet who (if anyone) is signed in. Creating a project
         *  before then makes it ownerless, which flips the project view
         *  read-only the moment auth lands and silently drops the creator's
         *  first keystrokes. */
        ready?: boolean;
    }

    let { add, ready = true }: Props = $props();

    let creating = $state(false);

    async function newProject() {
        creating = true;
        add(
            Project.make(
                null,
                '',
                new Source(
                    $locales.getUnannotatedText((l) => l.glossary.start.word),
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
    {#if creating || !ready}
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
