<script lang="ts">
    import { get } from 'svelte/store';
    import { Galleries, Projects, locale } from '../../db/Database';
    import type Project from '../../models/Project';
    import Subheader from '../app/Subheader.svelte';
    import MarkupHtmlView from '../concepts/MarkupHTMLView.svelte';
    import Dialog from '../widgets/Dialog.svelte';
    import Options from '../widgets/Options.svelte';
    import { getUser } from './Contexts';
    import CreatorList from './CreatorList.svelte';
    import Public from './Public.svelte';

    export let show: boolean;
    export let project: Project;

    const user = getUser();
    const creatorGalleries = Galleries.creatorGalleries;
</script>

<Dialog bind:show description={$locale.ui.dialog.share}>
    <Subheader
        >{$locale.ui.dialog.share.subheader.collaborators.header}</Subheader
    >
    <MarkupHtmlView
        markup={$locale.ui.dialog.share.subheader.collaborators.explanation}
    />

    <CreatorList
        creators={project.collaborators}
        editable={$user !== null && project.owner === $user.uid}
        add={(userID) =>
            Projects.reviseProject(project.withCollaborator(userID))}
        remove={(userID) =>
            Projects.reviseProject(project.withoutCollaborator(userID))}
        removable={() => true}
    />

    <Subheader>{$locale.ui.dialog.share.subheader.gallery.header}</Subheader>
    <MarkupHtmlView
        markup={$locale.ui.dialog.share.subheader.gallery.explanation}
    />

    <Options
        id="gallerychooser"
        value={project.gallery ?? undefined}
        options={[
            { value: undefined, label: '—' },
            ...Array.from($creatorGalleries.values()).map((gallery) => {
                return {
                    value: get(gallery).getID(),
                    label: get(gallery).getName($locale),
                };
            }),
        ]}
        change={(value) => {
            // Ask the gallery database to put this project in the gallery.
            if (value) Galleries.addProject(project, value);
            else Galleries.removeProject(project);
        }}
    />

    <Public
        isPublic={project.public}
        set={(choice) => Projects.reviseProject(project.asPublic(choice === 1))}
    />
</Dialog>

<style>
</style>
