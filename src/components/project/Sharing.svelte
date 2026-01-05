<script lang="ts">
    import Notice from '@components/app/Notice.svelte';
    import { toClipboard } from '@components/editor/commands/Clipboard';
    import Button from '@components/widgets/Button.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { CONFIRM_SYMBOL, COPY_SYMBOL } from '@parser/Symbols';
    import { Galleries, Projects, locales } from '../../db/Database';
    import type Project from '../../db/projects/Project';
    import Subheader from '../app/Subheader.svelte';
    import MarkupHTMLView from '../concepts/MarkupHTMLView.svelte';
    import Options from '../widgets/Options.svelte';
    import { getUser } from './Contexts';
    import PII from './PII.svelte';
    import Public from './Public.svelte';

    interface Props {
        project: Project;
    }

    let { project }: Props = $props();

    let copied = $state(false);

    const user = getUser();
</script>

{#if $user === null}
    <Notice text={(l) => l.ui.dialog.share.error.anonymous} />
{:else}
    <Subheader text={(l) => l.ui.dialog.share.subheader.copy.header} />

    <MarkupHTMLView
        markup={(l) => l.ui.dialog.share.subheader.copy.explanation}
    />

    <Button
        background
        tip={(l) => l.ui.project.button.copy.tip}
        action={() => {
            copied = false;
            toClipboard(project.toWordplay());
            // In case its already pressed, show it again.
            setTimeout(() => (copied = true), 100);
        }}
        icon={COPY_SYMBOL}
    >
        <LocalizedText path={(l) => l.ui.project.button.copy.label} />
        {#if copied}{CONFIRM_SYMBOL}{/if}</Button
    >

    <Subheader text={(l) => l.ui.dialog.share.subheader.gallery.header} />

    <MarkupHTMLView
        markup={(l) => l.ui.dialog.share.subheader.gallery.explanation}
    />

    <Options
        id="gallerychooser"
        label={(l) => l.ui.dialog.share.options.gallery}
        value={project.getGallery() ?? undefined}
        options={[
            { value: undefined, label: '—' },
            ...Array.from(Galleries.accessibleGalleries.values()).map(
                (gallery) => {
                    return {
                        value: gallery.getID(),
                        label: gallery.getName($locales),
                    };
                },
            ),
        ]}
        change={(galleryID) => {
            // Ask the gallery database to put this project in the gallery.
            if (galleryID) Galleries.addProject(project, galleryID);
            else {
                Galleries.removeProject(project, null);
            }
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
