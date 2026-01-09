<script lang="ts">
    import Button from '@components/widgets/Button.svelte';
    import { locales } from '@db/Database';
    import Project from '@db/projects/Project';
    import Source from '@nodes/Source';

    interface Props {
        add: (newProject: Project) => void;
    }

    let { add }: Props = $props();

    async function newProject() {
        add(
            Project.make(
                null,
                '',
                new Source(
                    $locales.get((l) => l.term.start),
                    $locales.get((l) => l.ui.project.defaults.starterCode),
                ),
                [],
                $locales.getLocales(),
            ),
        );
    }
</script>

<p class="add">
    <Button
        tip={(l) => l.ui.page.projects.button.newproject}
        action={newProject}
        testid="addproject"
        large
        icon="+"
    ></Button></p
>
