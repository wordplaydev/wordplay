<script lang="ts">
    import Subheader from '@components/app/Subheader.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import Dialog from '@components/widgets/Dialog.svelte';
    import FormattedEditor from '@components/widgets/FormattedEditor.svelte';
    import EmojiChooser from '@components/widgets/GlyphChooser.svelte';
    import Mode from '@components/widgets/Mode.svelte';
    import type { Option } from '@components/widgets/Options.svelte';
    import Options from '@components/widgets/Options.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import { Galleries, locales } from '@db/Database';
    import Gallery from '@db/galleries/Gallery';
    import { CANCEL_SYMBOL } from '@parser/Symbols';

    interface Props {
        gallery: Gallery;
    }

    let { gallery }: Props = $props();

    let show: boolean = $state(false);

    let expandedScope: boolean = $derived(gallery.getHowToExpandedVisibility());
    let guidingQuestionsText: string = $derived(
        gallery.getHowToGuidingQuestions().join('\n'),
    );

    let reactions: [string, string, boolean][] = $state([]);
    $effect(() => {
        reactions = Object.entries(gallery.getHowToReactions()).map(
            ([emoji, description]) => [emoji, description, false],
        );
    });

    let user = getUser();
    let expandedGalleries: string[] = $derived(
        gallery.getHowToExpandedGalleries(),
    );
    let expandedGalleryToAdd: string | undefined = $state(undefined);
    let galleryAddQueue: string[] = $state([]);
    let galleryRemoveQueue: string[] = $state([]);
    let expandedGalleryOptions: Option[] = $derived([
        { value: undefined, label: '—' },
        ...($user
            ? [...Galleries.accessibleGalleries.values()].filter(
                  (g) =>
                      g.hasCurator($user.uid) &&
                      g.getID() !== gallery.getID() &&
                      !expandedGalleries.includes(g.getID()) &&
                      !galleryAddQueue.includes(g.getID()),
              )
            : []
        ).map((g) => ({
            label: g.getName($locales),
            value: g.getID(),
        })),
    ]);

    function addExpandedGalleryToList() {
        if (expandedGalleryToAdd) {
            galleryAddQueue.push(expandedGalleryToAdd);
            expandedGalleryToAdd = undefined;
        }
    }

    function addExpansionToGallery(toModify: Gallery, toAdd: string): Gallery {
        let toAddGalleryObject: Gallery | undefined =
            Galleries.accessibleGalleries.get(toAdd);
        let toAddGalleryViewers: string[] = toAddGalleryObject
            ? [
                  ...toAddGalleryObject.getCurators(),
                  ...toAddGalleryObject.getCreators(),
              ]
            : [];

        return toModify.withExpandedGallery(toAdd, toAddGalleryViewers);
    }

    async function submitChanges() {
        show = false;

        let reactionsObject: Record<string, string> = Object.fromEntries(
            new Map<string, string>(
                reactions.map(([emoji, description, _]) => [
                    emoji,
                    description,
                ]),
            ),
        );

        gallery = new Gallery({
            ...gallery.getData(),
            howToExpandedVisibility: expandedScope,
            howToGuidingQuestions: guidingQuestionsText
                .split('\n')
                .map((line) => line.trim())
                .filter((line) => line.length > 0),
            howToReactions: reactionsObject,
        });

        galleryAddQueue.forEach((galleryId) => {
            gallery = addExpansionToGallery(gallery, galleryId);
        });

        galleryRemoveQueue.forEach((galleryId) => {
            gallery = gallery.withoutExpandedGallery(galleryId);
        });

        Galleries.edit(gallery);

        galleryAddQueue = [];
        galleryRemoveQueue = [];
    }
</script>

{#snippet expandedGallery(name: string, id: string)}
    <form class="form">
        <MarkupHTMLView inline markup={name} />
        <Button
            submit
            padding={false}
            tip={(l) => l.ui.howto.configuration.visibility.expandedRemove}
            action={() => {
                galleryRemoveQueue.push(id);
            }}
            icon={CANCEL_SYMBOL}
        ></Button>
    </form>
{/snippet}

<Dialog
    bind:show
    header={(l) => l.ui.howto.configuration.configurationDialog.header}
    explanation={(l) =>
        l.ui.howto.configuration.configurationDialog.explanation}
    button={{
        tip: (l) => l.ui.howto.configuration.configurationButton.tip,
        label: (l) => l.ui.howto.configuration.configurationButton.label,
    }}
>
    <Subheader
        text={(l) => l.ui.howto.configuration.visibility.subheader.header}
    />
    <MarkupHTMLView
        markup={(l) =>
            l.ui.howto.configuration.visibility.subheader.explanation}
    />
    <Mode
        modes={(l) => l.ui.howto.configuration.visibility.mode}
        choice={expandedScope ? 1 : 0}
        icons={['', '']}
        select={(num) => (expandedScope = num === 1)}
    />
    {#if expandedScope}
        {@const showGallery = [...expandedGalleries, ...galleryAddQueue].filter(
            (id) => !galleryRemoveQueue.includes(id),
        )}
        {#each showGallery as galleryId}
            {@const gallery = Galleries.accessibleGalleries.get(galleryId)}
            {#if gallery}
                {@render expandedGallery(gallery.getName($locales), galleryId)}
            {/if}
        {/each}
        <form class="form">
            <Options
                label={(l) =>
                    l.ui.howto.configuration.visibility.expandedOptions}
                options={expandedGalleryOptions}
                bind:value={expandedGalleryToAdd}
                change={(newValue) => (expandedGalleryToAdd = newValue)}
            />
            <Button
                submit
                background
                tip={(l) => l.ui.howto.configuration.visibility.expandedAdd}
                active={expandedGalleryToAdd !== undefined}
                action={() => {
                    addExpandedGalleryToList();
                }}
                >&gt;
            </Button>
        </form>
    {/if}

    <Subheader
        text={(l) => l.ui.howto.configuration.guidingQuestions.subheader.header}
    />
    <MarkupHTMLView
        markup={(l) =>
            l.ui.howto.configuration.guidingQuestions.subheader.explanation}
    />
    <FormattedEditor
        id="guidingquestions"
        description={(l) =>
            l.ui.howto.configuration.guidingQuestions.descriptor}
        placeholder={(l) => ''}
        bind:text={guidingQuestionsText}
    />

    <Subheader
        text={(l) => l.ui.howto.configuration.reactions.subheader.header}
    />
    <MarkupHTMLView
        markup={(l) => l.ui.howto.configuration.reactions.subheader.explanation}
    />
    {#each reactions as _, index}
        <div class="reactionConfiguration">
            <Button
                tip={(l) =>
                    l.ui.howto.configuration.reactions.reactionPickerTip}
                action={() => {
                    reactions[index][2] = !reactions[index][2];
                }}
                icon={reactions[index][0]}
                background={reactions[index][2]}
            />

            <TextField
                id={'reactiondescription' + index}
                description={(l) =>
                    l.ui.howto.configuration.reactions.reactionDescriptionTip}
                placeholder={(l) =>
                    l.ui.howto.configuration.reactions.reactionDescriptionTip}
                bind:text={reactions[index][1]}
            />

            <Button
                tip={(l) =>
                    l.ui.howto.configuration.reactions.removeReactionTip}
                icon={CANCEL_SYMBOL}
                action={() => {
                    reactions.splice(index, 1);
                }}
            />
        </div>
        {#if reactions[index][2]}
            <EmojiChooser
                pick={(emoji) => (reactions[index][0] = emoji)}
                glyph={reactions[index][0]}
            />
        {/if}
    {/each}
    <Button
        tip={(l) => l.ui.howto.configuration.reactions.addReactionTip}
        icon={'+'}
        action={() => {
            reactions.push(['😀', '', false]);
        }}
    />

    <Button
        label={(l) => l.ui.howto.configuration.submit.label}
        tip={(l) =>
            guidingQuestionsText.trim().length > 0 && reactions.length > 0
                ? l.ui.howto.configuration.submit.tip
                : l.ui.howto.configuration.submit.error}
        action={submitChanges}
        submit={true}
        active={guidingQuestionsText.trim().length > 0 && reactions.length > 0}
    />
</Dialog>

<style>
    .reactionConfiguration {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
    }
</style>
