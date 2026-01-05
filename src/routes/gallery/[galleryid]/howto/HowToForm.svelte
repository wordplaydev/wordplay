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
    import { Chats, Galleries, HowTos, locales } from '@db/Database';
    import type Gallery from '@db/galleries/Gallery';
    import HowTo from '@db/howtos/HowToDatabase.svelte';
    import type { ButtonText } from '@locale/UITexts';
    import { COLLABORATE_SYMBOL } from '@parser/Symbols';
    import type { Snippet } from 'svelte';
    import HowToPrompt from './HowToPrompt.svelte';
    import HowToUsedBy from './HowToUsedBy.svelte';
    import { movePermitted } from './utils';

    // defining props
    interface Props {
        editingMode: boolean; // true if editing, false if viewing
        howTo: HowTo | undefined; // undefined if creating a brand new how-to
        notPermittedAreas: Map<string, [number, number, number, number]>;
        cameraX: number;
        cameraY: number;
        preview?: Snippet;
    }

    let {
        editingMode,
        howTo = $bindable(),
        notPermittedAreas,
        cameraX,
        cameraY,
        preview = undefined,
    }: Props = $props();

    // utility variables
    let howToId: string = $derived(howTo?.getHowToId() ?? '');
    const galleryID: string = decodeURI(page.params.galleryid);

    // Load the gallery if it exists.
    let gallery = $state<Gallery | undefined>(undefined);
    $effect(() => {
        if (galleryID) {
            Galleries.get(galleryID).then((g) => {
                gallery = g;
            });
        } else gallery = undefined;
    });

    const user = getUser();

    // component's own states
    let show: boolean = $state(false);
    let notify: boolean = $state(true);

    let isPublished: boolean = $derived(howTo ? howTo.isPublished() : false);
    let userHasBookmarked: boolean = $derived(
        $user && howTo ? howTo.getBookmarkers().includes($user.uid) : false,
    );
    let reactions: Record<string, string[]> = $derived(
        howTo ? howTo.getUserReactions() : {},
    );
    let prompts: string[] = $derived(
        howTo
            ? howTo.getGuidingQuestions()
            : gallery
              ? gallery.getHowToGuidingQuestions()
              : [],
    );
    let text: string[] = $derived(
        howTo ? howTo.getText() : Array(prompts.length).fill(''),
    );
    let newText: string[] = $derived([...text]); // can't bind to text itself, so make a copy and edit that
    let title: string = $derived(howTo ? howTo.getTitle() : '');
    let allCollaborators: string[] = $derived(
        howTo ? [...howTo.getCollaborators(), howTo.getCreator()] : [],
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
        let writeX, writeY;

        writeX = -cameraX;
        writeY = -cameraY;
        let numSearchAttempts = 0;

        while (
            !movePermitted(writeX, writeY, 100, 100, '', notPermittedAreas)
        ) {
            if (numSearchAttempts < 5) {
                writeX += 150;
            } else if (numSearchAttempts == 5) {
                writeX = -cameraX - 150;
            } else if (numSearchAttempts < 10) {
                writeX -= 150;
            } else if (numSearchAttempts == 10) {
                writeX = -cameraX;
                writeY += 150;
            } else if (numSearchAttempts == 15) {
                writeY = -cameraY - 150;
            } else if (numSearchAttempts < 20) {
                writeY -= 150;
            } else {
                break; // prevent infinite loop
            }

            numSearchAttempts++;
        }

        return [writeX, writeY];
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
            let returnValue = await HowTos.addHowTo(
                galleryID,
                publish,
                writeX,
                writeY,
                allCollaborators,
                title,
                prompts,
                newText,
                ['en-US'],
                reactionButtons.map((b) => [b.label, b.tip]),
            );

            howTo = returnValue ? returnValue : undefined;
            show = false;
            editingMode = true;
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
                text: newText,
                xcoord: writeX,
                ycoord: writeY,
            });

            HowTos.updateHowTo(howTo, true);
            editingMode = false;
        }

        newText = [];
    }

    function submitToGuide() {
        if (!howTo) return;

        howTo = new HowTo({
            ...howTo.getData(),
            submittedToGuide: true,
        });

        HowTos.updateHowTo(howTo, true);
    }

    function addRemoveBookmark() {
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
            bookmarkers: newBookmarkers,
        });

        HowTos.updateHowTo(howTo, true);
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
            reactions: newReactions,
        });

        HowTos.updateHowTo(howTo, true);
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

    // TODO(@mc) -- uncomment this once it works again
    let creators: Record<string, Creator | null> = $state({});

    // // Set the creators to whatever user IDs we have.
    // $effect(() => {
    //     if (!howTo) return;

    //     const owner = howTo.getCreator();
    //     // We async load all participants, regardless of their chat eligibility, since we need to render
    //     // their names.
    //     Creators.getCreatorsByUIDs(
    //         chat
    //             ? [...chat.getAllParticipants(), ...(owner ? [owner] : [])]
    //             : owner
    //               ? [owner]
    //               : [],
    //     ).then((map) => (creators = map));
    // });

    let collabToggle: boolean = $state(false);
</script>

{#if preview}
    <Button
        tip={(l) =>
            editingMode
                ? l.ui.howto.editor.editForm.header
                : l.ui.howto.viewer.view.tip}
        action={() => (show = !show)}>{@render preview()}</Button
    >
{:else}
    <Button
        tip={(l) =>
            howTo
                ? l.ui.howto.drafts.tooltip
                : l.ui.howto.editor.newForm.header}
        action={() => (show = !show)}
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
            : title}
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

        {#each prompts as prompt, i (i)}
            <HowToPrompt text={(l) => prompt} />
            <FormattedEditor
                placeholder={(l) => l.ui.howto.editor.editorPlaceholder}
                description={(l) => l.ui.howto.editor.editorDescription}
                bind:text={newText[i]}
                id="howto-prompt-{i}"
            />
        {/each}

        <div class="optionsarea">
            {#if collabToggle}
                <div class="optionspanel">
                    <Subheader>
                        {COLLABORATE_SYMBOL}{TileKind.Collaborate}
                    </Subheader>
                    <!-- TODO(@mc) -- collaboration is not tested!!! -->
                    <MarkupHTMLView
                        markup={(l) => l.ui.howto.editor.collaboratorsPrompt}
                    ></MarkupHTMLView>

                    <Labeled label={(l) => l.ui.collaborate.role.collaborators}>
                        <CreatorList
                            anonymize={false}
                            uids={allCollaborators}
                            editable={true}
                            add={(userID) => allCollaborators.push(userID)}
                            remove={(userID) =>
                                (allCollaborators = allCollaborators.filter(
                                    (uid) => uid !== userID,
                                ))}
                            removable={() => true}
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
                {#if !howTo}
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
                                    howTo && howTo.getSubmittedToGuide()
                                        ? l.ui.howto.viewer.submitToGuide
                                              .alreadySubmitted.tip
                                        : l.ui.howto.viewer.submitToGuide.submit
                                              .tip}
                                label={(l) =>
                                    howTo && howTo.getSubmittedToGuide()
                                        ? l.ui.howto.viewer.submitToGuide
                                              .alreadySubmitted.label
                                        : l.ui.howto.viewer.submitToGuide.submit
                                              .label}
                                active={!howTo.getSubmittedToGuide()}
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
                    {/if}
                </div>

                {#each prompts as prompt, i (i)}
                    <HowToPrompt text={(l) => prompt} />
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
                                reactions[reaction.label].length}
                            active={true}
                            background={$user
                                ? reactions[reaction.label].includes($user.uid)
                                : false}
                            action={() => {
                                addRemoveReaction(reaction.label);
                            }}
                        />
                    {/each}

                    <HowToUsedBy bind:howTo />

                    <HowToPrompt text={(l) => l.ui.howto.viewer.chatPrompt} />

                    <ChatView {chat} {creators} {gallery} {howTo} />
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
</style>
