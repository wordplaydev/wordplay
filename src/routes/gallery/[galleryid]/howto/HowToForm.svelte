<script lang="ts">
    import { page } from '$app/state';
    import ChatView from '@components/app/chat/ChatView.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser } from '@components/project/Contexts';
    import CreatorList from '@components/project/CreatorList.svelte';
    import { TileKind } from '@components/project/Tile';
    import Button from '@components/widgets/Button.svelte';
    import ConfirmButton from '@components/widgets/ConfirmButton.svelte';
    import Dialog from '@components/widgets/Dialog.svelte';
    import FormattedEditor from '@components/widgets/FormattedEditor.svelte';
    import Labeled from '@components/widgets/Labeled.svelte';
    import Mode from '@components/widgets/Mode.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import Toggle from '@components/widgets/Toggle.svelte';
    import type Chat from '@db/chats/ChatDatabase.svelte';
    import type { Creator } from '@db/creators/CreatorDatabase';
    import { Chats, Creators, Galleries, HowTos, locales } from '@db/Database';
    import type Gallery from '@db/galleries/Gallery';
    import HowTo from '@db/howtos/HowToDatabase.svelte';
    import type { ButtonText } from '@locale/UITexts';
    import { COLLABORATE_SYMBOL } from '@parser/Symbols';
    import type { Snippet } from 'svelte';
    import type { SvelteMap } from 'svelte/reactivity';
    import HowToPrompt from './HowToPrompt.svelte';
    import HowToUsedBy from './HowToUsedBy.svelte';
    import { movePermitted } from './utils';

    // defining props
    interface Props {
        editingMode: boolean; // true if editing, false if viewing
        howTo: HowTo | undefined; // undefined if creating a brand new how-to
        notPermittedAreas: SvelteMap<string, [number, number, number, number]>;
        cameraX: number;
        cameraY: number;
        preview?: Snippet;
    }

    let {
        editingMode,
        howTo = $bindable(),
        notPermittedAreas,
        cameraX = $bindable(),
        cameraY = $bindable(),
        preview = undefined,
    }: Props = $props();

    // utility variables
    let howToId: string = $derived(howTo?.getHowToId() ?? '');
    const galleryID: string = decodeURI(page.params.galleryid);

    // Load the gallery if it exists.
    let gallery = $state<Gallery | undefined>(undefined);
    let galleryQuestions: string[] = $state([]);
    $effect(() => {
        if (galleryID) {
            Galleries.get(galleryID).then((g) => {
                gallery = g;

                if (gallery) {
                    galleryQuestions = gallery.getHowToGuidingQuestions();
                }
            });
        } else gallery = undefined;
    });

    const user = getUser();

    // component's own states
    let show: boolean = $state(false);

    // data from the how-to
    let isPublished: boolean = $derived(howTo ? howTo.isPublished() : false);
    let notify: boolean = $derived(howTo ? howTo.getNotifySubscribers() : true);

    // prompts and editing
    let title: string = $derived(howTo ? howTo.getTitle() : '');

    let allCollaborators: string[] = $state([]);

    $effect(() => {
        if (howTo) {
            allCollaborators = [
                ...howTo.getCollaborators(),
                howTo.getCreator(),
            ];
        } else if ($user) {
            allCollaborators = [$user.uid];
        }
    });

    let prompts: string[] = $derived(
        howTo ? howTo.getGuidingQuestions() : galleryQuestions,
    );
    let text: string[] = $state([]);
    $effect(() => {
        if (prompts.length > 0)
            text = howTo ? howTo.getText() : Array(prompts.length).fill('');
    });

    // social interactions
    let userHasBookmarked: boolean = $derived(
        $user && howTo ? howTo.getBookmarkers().includes($user.uid) : false,
    );
    let reactions: Record<string, string[]> = $derived(
        howTo ? howTo.getReactions() : {},
    );

    let isSubmitted: boolean = $derived(
        howTo ? howTo.getSubmittedToGuide() : false,
    );

    let reactionButtons: ButtonText[] = $derived(
        Object.entries(
            howTo
                ? howTo.getReactionOptions()
                : gallery
                  ? gallery.getHowToReactions()
                  : {},
        ).map(([emoji, description]) => ({
            label: emoji,
            tip: description,
        })),
    );

    function findPlaceToWrite() {
        const searchStep: number = 150; // distance to shift by each search
        const maxSearches: number = 20; // maximum number of search attempts, to prevent infinite loop

        let baseX = -cameraX;
        let baseY = -cameraY;

        let proposedX = baseX;
        let proposedY = baseY;

        for (let i = 0; i < maxSearches; i++) {
            /** search grid!
             * 8 5 3
             * 6 0 1
             * 7 4 2
             */
            if (
                movePermitted(
                    proposedX,
                    proposedY,
                    searchStep - 30,
                    searchStep - 30,
                    '',
                    notPermittedAreas,
                )
            ) {
                break;
            }

            let gridIndex = (i % 8) + 1;
            let multiplier = Math.floor(i / 8) + 1;

            switch (gridIndex) {
                case 1:
                    proposedX = baseX + searchStep * multiplier;
                    proposedY = baseY;
                    break;
                case 2:
                    proposedX = baseX + searchStep * multiplier;
                    proposedY = baseY + searchStep * multiplier;
                    break;
                case 3:
                    proposedX = baseX + searchStep * multiplier;
                    proposedY = baseY - searchStep * multiplier;
                    break;
                case 4:
                    proposedX = baseX;
                    proposedY = baseY + searchStep * multiplier;
                    break;
                case 5:
                    proposedX = baseX;
                    proposedY = baseY - searchStep * multiplier;
                    break;
                case 6:
                    proposedX = baseX - searchStep * multiplier;
                    proposedY = baseY;
                    break;
                case 7:
                    proposedX = baseX - searchStep * multiplier;
                    proposedY = baseY + searchStep * multiplier;
                    break;
                case 8:
                    proposedX = baseX - searchStep * multiplier;
                    proposedY = baseY - searchStep * multiplier;
                    break;
            }
        }

        return [proposedX, proposedY];
    }

    // writer functions
    async function writeNewHowTo(publish: boolean) {
        if (title.length === 0)
            title = $locales.get((l) => l.ui.howto.editor.titlePlaceholder);

        let writeX: number = 0;
        let writeY: number = 0;

        if (publish) {
            [writeX, writeY] = findPlaceToWrite();
        }

        if (!howTo) {
            await HowTos.addHowTo(
                galleryID,
                publish,
                writeX,
                writeY,
                allCollaborators,
                title,
                prompts,
                text,
                ['en-US'],
                gallery ? gallery.getHowToReactions() : {},
                notify,
            );

            // pan the camera to the new how-to
            [cameraX, cameraY] = [-writeX, -writeY];
            show = false;
            editingMode = true;

            // reset form
            howTo = undefined;
            title = '';
            text = Array(prompts.length).fill('');
            allCollaborators = [];
        } else {
            // if was not published, and now is published, need to find coordinates for the how-to
            // if was already published, then keep the same coordinates
            let [writeX, writeY] = howTo.getCoordinates();

            if (!isPublished) {
                [writeX, writeY] = findPlaceToWrite();
            }

            howTo = new HowTo({
                ...howTo.getData(),
                published: publish,
                title: title,
                text: text,
                xcoord: writeX,
                ycoord: writeY,
                collaborators: allCollaborators,
                social: {
                    ...howTo.getSocial(),
                    notifySubscribers: notify,
                },
            });

            // pan the camera to the updated how-to
            [cameraX, cameraY] = [-writeX, -writeY];
            HowTos.updateHowTo(howTo, true);
            editingMode = false;
        }
    }

    function submitToGuide() {
        if (!howTo) return;

        howTo = new HowTo({
            ...howTo.getData(),
            social: {
                ...howTo.getSocial(),
                submittedToGuide: true,
            },
        });

        HowTos.updateHowTo(howTo, true);
    }

    async function addRemoveBookmark() {
        if (!$user || !howTo) return;
        let newBookmarkers;

        if (userHasBookmarked) {
            // remove bookmark

            newBookmarkers = howTo
                .getBookmarkers()
                .filter((uid) => uid !== $user.uid);
        } else {
            // add bookmark

            newBookmarkers = [...howTo.getBookmarkers(), $user.uid];
        }

        howTo = new HowTo({
            ...howTo.getData(),
            social: {
                ...howTo.getSocial(),
                bookmarkers: newBookmarkers,
            },
        });

        await HowTos.updateHowTo(howTo, true);
    }

    function addRemoveReaction(reactionLabel: string) {
        if (!$user || !howTo) return;
        let newReactions;

        if (reactions[reactionLabel]?.includes($user.uid)) {
            // remove reaction

            newReactions = {
                ...reactions,
                [reactionLabel]: reactions[reactionLabel].filter(
                    (uid) => uid !== $user.uid,
                ),
            };
        } else {
            // add reaction

            newReactions = {
                ...reactions,
                [reactionLabel]: [...reactions[reactionLabel], $user.uid],
            };
        }

        howTo = new HowTo({
            ...howTo.getData(),
            social: {
                ...howTo.getSocial(),
                reactions: newReactions,
            },
        });

        HowTos.updateHowTo(howTo, true);
    }

    function updateCollaborators(toChangeID: string, add: boolean) {
        if (add) {
            if (!allCollaborators.includes(toChangeID))
                allCollaborators.push(toChangeID);
        } else {
            allCollaborators = allCollaborators.filter(
                (uid) => uid !== toChangeID,
            );
        }

        if (!howTo) return;

        howTo = new HowTo({
            ...howTo.getData(),
            collaborators: allCollaborators,
        });

        HowTos.updateHowTo(howTo, true);

        // rely on listener to update social interaction participants
    }

    // variables to set up the chat
    // Get the chat for the how-to, if there is one.
    // undefined: there isn't one
    // null: we're still loading
    // false: couldn't load it.
    let chat = $state<Chat | undefined | null | false>(null);
    $effect(() => {
        // When the how-to or chat change, get the chat.
        if (howTo)
            Chats.getChatHowTo(howTo).then((retrievedChat) => {
                chat = retrievedChat;
            });
    });

    // get all people who are eligible to chat
    let chatParticipants: Record<string, Creator | null> = $state({});
    $effect(() => {
        if (!howTo || !show) return;

        const owner = howTo.getCreator();

        Creators.getCreatorsByUIDs(
            chat
                ? [...chat.getAllParticipants(), ...(owner ? [owner] : [])]
                : allCollaborators,
        ).then((map) => {
            if (map) {
                chatParticipants = map;
            }
        });
    });

    let collabToggle: boolean = $state(false);

    function previewButtonPressed() {
        show = true;

        if (show && howTo) {
            let newSeenByUsers: string[] = howTo.getSeenByUsers();
            if ($user && !newSeenByUsers.includes($user.uid))
                newSeenByUsers.push($user.uid);

            howTo = new HowTo({
                ...howTo.getData(),
                social: {
                    ...howTo.getSocial(),
                    seenByUsers: newSeenByUsers,
                    viewCount: howTo.getViewCount() + 1,
                },
            });
        }
    }
</script>

{#if preview}
    <Button
        tip={(l) =>
            editingMode
                ? l.ui.howto.editor.editForm.header
                : l.ui.howto.viewer.view.tip}
        action={previewButtonPressed}
    >
        {@render preview()}
    </Button>
{:else}
    <Button
        tip={(l) =>
            howTo
                ? l.ui.howto.drafts.tooltip
                : l.ui.howto.editor.newForm.header}
        action={previewButtonPressed}
        icon={howTo ? howTo.getTitle() : '+'}
        large={!howTo}
    ></Button>
{/if}
<Dialog
    bind:show
    header={(l) =>
        editingMode
            ? !howTo
                ? l.ui.howto.editor.newForm.header
                : l.ui.howto.editor.editForm.header
            : ''}
    explanation={(l) =>
        editingMode
            ? !howTo
                ? l.ui.howto.editor.newForm.explanation
                : l.ui.howto.editor.editForm.explanation
            : l.ui.howto.editor.editForm.explanation}
>
    {#if editingMode}
        <Subheader>
            <TextField
                bind:text={title}
                description={(l) => l.ui.howto.editor.title.description}
                placeholder={(l) => l.ui.howto.editor.title.placeholder}
                id="howto-title"
            />
        </Subheader>

        {#each text as t, i (i)}
            <HowToPrompt text={(l) => prompts[i]} />
            <FormattedEditor
                placeholder={(l) => l.ui.howto.editor.editorPlaceholder}
                description={(l) => l.ui.howto.editor.editorDescription}
                bind:text={text[i]}
                id="howto-prompt-{i}"
            />
        {/each}

        <div class="optionsarea">
            {#if collabToggle}
                <div class="optionspanel">
                    <Subheader>
                        {COLLABORATE_SYMBOL}{TileKind.Collaborate}
                    </Subheader>
                    <MarkupHTMLView
                        markup={(l) => l.ui.howto.editor.collaboratorsPrompt}
                    ></MarkupHTMLView>

                    <Labeled label={(l) => l.ui.collaborate.role.collaborators}>
                        <CreatorList
                            anonymize={false}
                            uids={allCollaborators}
                            editable={true}
                            add={(userID) => {
                                updateCollaborators(userID, true);
                            }}
                            remove={(userID) => {
                                updateCollaborators(userID, false);
                            }}
                            removable={(uid) => uid !== howTo?.getCreator()}
                        />
                    </Labeled>
                </div>
            {/if}
        </div>

        <div class="toolbar">
            <div class="toolbar-left">
                <Toggle
                    tips={(l) => l.ui.howto.editor.collaboratorsToggle}
                    on={collabToggle}
                    toggle={() => {
                        collabToggle = !collabToggle;
                    }}
                >
                    {COLLABORATE_SYMBOL}
                    {TileKind.Collaborate}
                </Toggle>
            </div>
            <div class="toolbar-right">
                {#if !howTo || !howTo.isPublished()}
                    <Mode
                        modes={(l) => l.ui.howto.editor.notification}
                        choice={notify ? 0 : 1}
                        icons={['🔔', '🔕']}
                        select={(num) => (notify = num === 0)}
                    />
                {/if}

                {#if !howTo?.isPublished()}
                    <Button
                        tip={(l) => l.ui.howto.editor.save.tip}
                        label={(l) => l.ui.howto.editor.save.label}
                        action={() => {
                            writeNewHowTo(false);
                        }}
                        active={true}
                    />
                {/if}
                <Button
                    tip={(l) => l.ui.howto.editor.post.tip}
                    label={(l) => l.ui.howto.editor.post.label}
                    action={() => {
                        writeNewHowTo(true);
                    }}
                    active={true}
                    submit={true}
                /></div
            >
        </div>
    {:else if howTo}
        <HowToPrompt>
            {title}
        </HowToPrompt>
        <div class="creatorlist">
            <CreatorList
                anonymize={false}
                editable={false}
                uids={allCollaborators}
            />
        </div>
        <div class="howtosplitview">
            <div class="splitside" id="howtoview">
                <div class="toolbar">
                    {#if $user && howTo.isCreatorCollaborator($user.uid)}
                        <Button
                            tip={(l) => l.ui.howto.viewer.edit.tip}
                            label={(l) => l.ui.howto.viewer.edit.label}
                            active={true}
                            action={() => {
                                editingMode = true;
                            }}
                        />
                        <ConfirmButton
                            tip={(l) => l.ui.howto.viewer.delete.description}
                            prompt={(l) => l.ui.howto.viewer.delete.prompt}
                            action={async () => {
                                if (galleryID && howTo) {
                                    await HowTos.deleteHowTo(
                                        howToId,
                                        galleryID,
                                    );
                                    show = false;
                                }
                            }}
                            label={(l) => l.ui.howto.viewer.delete.prompt}
                        />
                        {#if isPublished}
                            <Button
                                tip={(l) =>
                                    isSubmitted
                                        ? l.ui.howto.viewer.submitToGuide
                                              .alreadySubmitted.tip
                                        : l.ui.howto.viewer.submitToGuide.submit
                                              .tip}
                                label={(l) =>
                                    isSubmitted
                                        ? l.ui.howto.viewer.submitToGuide
                                              .alreadySubmitted.label
                                        : l.ui.howto.viewer.submitToGuide.submit
                                              .label}
                                active={!isSubmitted}
                                action={() => {
                                    submitToGuide();
                                }}
                            />
                        {/if}
                    {/if}
                    {#if isPublished}
                        <Button
                            tip={(l) =>
                                userHasBookmarked
                                    ? l.ui.howto.bookmarks.alreadyBookmarked.tip
                                    : l.ui.howto.bookmarks.canBookmark.tip}
                            label={(l) =>
                                userHasBookmarked
                                    ? l.ui.howto.bookmarks.alreadyBookmarked
                                          .label
                                    : l.ui.howto.bookmarks.canBookmark.label}
                            active={true}
                            background={userHasBookmarked}
                            action={() => {
                                addRemoveBookmark();
                            }}
                        />
                        <Button
                            tip={(l) => l.ui.howto.viewer.link.tip}
                            label={(l) => l.ui.howto.viewer.link.label}
                            action={async () => {
                                await navigator.clipboard.writeText(
                                    `${window.location.origin}/gallery/${galleryID}/howto?id=${howToId}`,
                                );
                            }}
                        />
                    {/if}
                </div>

                {#each text as t, i (i)}
                    <HowToPrompt text={(l) => prompts[i]} />
                    <MarkupHTMLView markup={text[i]} />
                {/each}
            </div>
            {#if isPublished}
                <div class="splitside" id="howtointeractions">
                    <HowToPrompt
                        text={(l) => l.ui.howto.viewer.reactionsPrompt}
                    />
                    {#each reactionButtons as reaction, i (i)}
                        <Button
                            tip={(l) => reaction.tip}
                            label={(l) =>
                                reaction.label +
                                ' ' +
                                (howTo
                                    ? howTo.getNumReactions(reaction.label)
                                    : 0)}
                            active={true}
                            background={$user && howTo
                                ? howTo.didUserReact($user.uid, reaction.label)
                                : false}
                            action={() => {
                                addRemoveReaction(reaction.label);
                            }}
                        />
                    {/each}

                    <HowToUsedBy bind:howTo />

                    <HowToPrompt text={(l) => l.ui.howto.viewer.chatPrompt} />

                    <ChatView
                        {chat}
                        creators={chatParticipants}
                        {gallery}
                        {howTo}
                    />
                </div>
            {:else}
                <HowToPrompt text={(l) => l.ui.howto.drafts.note} />
            {/if}
        </div>
    {/if}
</Dialog>

<style>
    .toolbar {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
        padding-bottom: var(--wordplay-spacing);
        border-bottom: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
        padding-top: var(--wordplay-spacing);
        border-top: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
        flex-wrap: wrap;
        max-width: 100%;
        justify-content: space-between;
    }

    .toolbar-left,
    .toolbar-right {
        display: flex;
        gap: var(--wordplay-spacing);
    }

    .splitside {
        height: 100%;
        max-height: 100%;
        width: 100%;
        padding: var(--wordplay-spacing);
        overflow-y: auto;
        overscroll-behavior-y: contain;
    }

    .howtosplitview {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--wordplay-spacing);
        height: 100%;
        overflow: hidden;
    }

    .optionsarea {
        width: 100%;
        max-width: 100%;
        display: flex;
    }

    .optionspanel {
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        padding: var(--wordplay-spacing);
        margin: var(--wordplay-spacing);
        max-width: 100%;
        width: 100%;
    }

    .creatorlist {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        margin-block-start: var(--wordplay-spacing);
        gap: var(--wordplay-spacing);
        row-gap: var(--wordplay-spacing);
        margin: var(--wordplay-spacing);
    }
</style>
