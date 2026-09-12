<!-- The projects a gallery holds, which is what a listing decision is about (#938). -->
<script lang="ts">
    import ProjectPreviewSet from '@components/app/ProjectPreviewSet.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import { DB } from '@db/Database';
    import type Gallery from '@db/galleries/Gallery';
    import type Project from '@db/projects/Project';
    import { localeGoto } from '@util/localeGoto';

    interface Props {
        gallery: Gallery;
    }

    let { gallery }: Props = $props();

    let projects = $state<Project[] | undefined>(undefined);
    $effect(() => {
        const showing = gallery;
        projects = undefined;
        DB.loadProjects()
            .then((db) =>
                Promise.all(showing.getProjects().map((id) => db.get(id))),
            )
            .then((loaded) => {
                // Another gallery may have come up while these were loading.
                if (gallery.getID() === showing.getID())
                    projects = loaded.filter(
                        (p): p is Project => p !== undefined,
                    );
            });
    });
</script>

{#if projects === undefined}
    <Spinning />
{:else}
    <ProjectPreviewSet
        set={projects}
        anonymize={false}
        edit={{
            description: (l) => l.ui.page.projects.button.viewproject,
            action: (project) => localeGoto(project.getLink(false)),
            label: '👁️',
        }}
        remove={() => false}
        copy={false}
    />
{/if}
