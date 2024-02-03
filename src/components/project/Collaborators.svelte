<script lang="ts">
    import { get } from 'svelte/store';
    import { Galleries, Projects, locales } from '../../db/Database';
    import type Project from '../../models/Project';
    import Subheader from '../app/Subheader.svelte';
    import MarkupHtmlView from '../concepts/MarkupHTMLView.svelte';
    import Options from '../widgets/Options.svelte';
    import { getUser } from './Contexts';
    import CreatorList from './CreatorList.svelte';
    import Public from './Public.svelte';
    import Feedback from '@components/app/Feedback.svelte';
    import PII from './PII.svelte';

    export let project: Project;

    const user = getUser();
    const creatorGalleries = Galleries.creatorGalleries;
</script>

{#if $user === null}
    <Feedback>{$locales.get((l) => l.ui.dialog.share.error.anonymous)}</Feedback
    >
{:else}
    <Subheader
        >{$locales.get(
            (l) => l.ui.dialog.share.subheader.collaborators.header,
        )}</Subheader
    >
    <MarkupHtmlView
        markup={$locales.get(
            (l) => l.ui.dialog.share.subheader.collaborators.explanation,
        )}
    />

    <CreatorList
        anonymize={false}
        uids={project.getCollaborators()}
        editable={$user !== null && project.getOwner() === $user.uid}
        add={(userID) =>
            Projects.reviseProject(project.withCollaborator(userID))}
        remove={(userID) =>
            Projects.reviseProject(project.withoutCollaborator(userID))}
        removable={() => true}
    />

    <Subheader
        >{$locales.get(
            (l) => l.ui.dialog.share.subheader.gallery.header,
        )}</Subheader
    >
    <MarkupHtmlView
        markup={$locales.get(
            (l) => l.ui.dialog.share.subheader.gallery.explanation,
        )}
    />

    <Options
        id="gallerychooser"
        label={$locales.get((l) => l.ui.dialog.share.options.gallery)}
        value={project.getGallery() ?? undefined}
        options={[
            { value: undefined, label: '—' },
            ...Array.from($creatorGalleries.values()).map((gallery) => {
                return {
                    value: get(gallery).getID(),
                    label: get(gallery).getName($locales),
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
        isPublic={project.isPublic()}
        set={(choice) => Projects.reviseProject(project.asPublic(choice === 1))}
        flags={project.getFlags()}
    />

    <PII
        nonPII={project.getNonPII()}
        unmark={(piiText) => Projects.reviseProject(project.withPII(piiText))}
    />
{/if}
