<script lang="ts">
    import { page } from '$app/state';
    import ChatView from '@components/app/chat/ChatView.svelte';
    import Header from '@components/app/Header.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser } from '@components/project/Contexts';
    import CreatorList from '@components/project/CreatorList.svelte';
    import Button from '@components/widgets/Button.svelte';
    import ConfirmButton from '@components/widgets/ConfirmButton.svelte';
    import Dialog from '@components/widgets/Dialog.svelte';
    import FormattedEditor from '@components/widgets/FormattedEditor.svelte';
    import Labeled from '@components/widgets/Labeled.svelte';
    import Mode from '@components/widgets/Mode.svelte';
    import Options, { type Option } from '@components/widgets/Options.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import Toggle from '@components/widgets/Toggle.svelte';
    import type Chat from '@db/chats/ChatDatabase.svelte';
    import type { Creator } from '@db/creators/CreatorDatabase';
    import {
        Chats,
        Creators,
        Galleries,
        HowTos,
        Locales,
        locales,
    } from '@db/Database';
    import type Gallery from '@db/galleries/Gallery';
    import HowTo from '@db/howtos/HowToDatabase.svelte';
    import type Locale from '@locale/Locale';
    import { localeToString, stringToLocale } from '@locale/Locale';
    import {
        getLanguageLocalDescription,
        type LocaleText,
    } from '@locale/LocaleText';
    import type { ButtonText } from '@locale/UITexts';
    import { onMount, type Snippet } from 'svelte';
    import { SvelteMap, SvelteSet } from 'svelte/reactivity';
    import { movePermitted } from './HowToMovement';
    import HowToPrompt from './HowToPrompt.svelte';
    import HowToUsedBy from './HowToUsedBy.svelte';

    // defining props
    interface Props {
        editingMode: boolean; // true if editing, false if viewing
        howTo: HowTo | undefined; // undefined if creating a brand new how-to
        notPermittedAreas: SvelteMap<string, [number, number, number, number]>;
        cameraX: number;
        cameraY: number;
        preview?: Snippet;
        whichDialogOpen: string | undefined;
    }

    let {
        editingMode,
        howTo = $bindable(),
        notPermittedAreas,
        cameraX = $bindable(),
        cameraY = $bindable(),
        preview = undefined,
        whichDialogOpen = $bindable(),
    }: Props = $props();

    // utility variables
    let howToId: string = $derived(howTo?.getHowToId() ?? '');
    const galleryID: string | undefined = page.params.galleryid
        ? decodeURI(page.params.galleryid)
        : undefined;

    // Load the gallery if it exists.
    let gallery = $state<Gallery | undefined>(undefined);
    let galleryQuestions: string[] = $state([]);
    onMount(async () => {
        if (galleryID) {
            gallery = await Galleries.get(galleryID);

            if (gallery) {
                galleryQuestions = gallery.getHowToGuidingQuestions();
            }
        } else {
            gallery = undefined;
        }
    });

    const user = getUser();

    // whether to show the preview form or not.
    let show: boolean = $state(false);
    $effect(() => {
        if (show) whichDialogOpen = howToId;
        else if (!show && whichDialogOpen === howToId)
            whichDialogOpen = undefined;
    });

    // data from the how-to
    let isPublished: boolean = $derived(howTo ? howTo.isPublished() : false);
    let notify: boolean = $derived(howTo ? howTo.getNotifySubscribers() : true);

    // prompts and editing
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

    // locales
    // defined as the first of the user's locales that is in the how-to's locales, if it exists
    // then the first of the how-to's locales if it doesn't
    let localeName: string = $state('');
    $effect(() => {
        if (howTo) {
            // loop through the user's preferred locales. let the localeName by the first of the preferred locales that the how-to has
            for (let locale of $locales.getPreferredLocales()) {
                if (howTo.getLocales().includes(localeToString(locale))) {
                    localeName = localeToString(locale);
                    return;
                }
            }
            localeName = howTo.getLocales()[0];
        } else {
            // if the how-to doesn't exist, just set the current locale name to be the most preferred locale
            localeName = $locales.getLocaleString();
        }
    });

    let localeList: SvelteSet<string> = $derived(
        new SvelteSet<string>([
            ...$locales.getLocales().map((l) => localeToString(l)),
            ...(howTo ? howTo.getLocales() : []),
        ]),
    );
    let localeOptions: Option[] = $derived.by(() => {
        let localeOptions: Option[] = [];

        [...localeList].forEach((loc) => {
            let localeObj: Locale | undefined = stringToLocale(loc);

            if (localeObj) {
                localeOptions.push({
                    label: getLanguageLocalDescription(localeObj),
                    value: loc,
                });
            }
        });

        return localeOptions;
    });

    // map of locale name to title in that locale
    // value is a string[] just to be able to use functions for how-to text without modification
    let titles: SvelteMap<string, string[]> = $state(
        new SvelteMap<string, string[]>(),
    );
    let titleInLocale: string = $derived(
        howTo ? howTo.getTitleInLocale($locales.getLocaleString()) : '',
    );

    // a map of locale name to an array of strings that correspond to each locale
    // the list of text corresponds to each prompt
    let multilingualText: SvelteMap<string, string[]> = $state(
        new SvelteMap<string, string[]>(),
    );
    onMount(() => {
        titles = howTo
            ? howTo.getTitleAsMap()
            : new SvelteMap<string, string[]>(
                  [...localeList].map((loc) => [loc, ['']]),
              );

        if (prompts.length > 0) {
            multilingualText = howTo
                ? howTo.getTextAsMap()
                : new SvelteMap<string, string[]>(
                      [...localeList].map((loc) => [
                          loc,
                          Array(prompts.length).fill(''),
                      ]),
                  );
        }
    });
    $effect(() => {
        if (!howTo && prompts.length > 0) {
            multilingualText = new SvelteMap<string, string[]>(
                [...localeList].map((loc) => [
                    loc,
                    Array(prompts.length).fill(''),
                ]),
            );
        }
    });

    // social interactions
    let userHasBookmarked: boolean = $derived(
        $user && howTo ? howTo.getBookmarkers().includes($user.uid) : false,
    );
    let reactions: Record<string, string[]> = $derived(
        howTo ? howTo.getReactions() : {},
    );

    // let isSubmitted: boolean = $derived(
    //     howTo ? howTo.getSubmittedToGuide() : false,
    // );

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
                    undefined,
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

    /** Add placeholder titles for any locales that have text but no title */
    async function generateTitleStringWithPlaceholders(
        textLocales: string[],
        titleMap: SvelteMap<string, string[]>,
    ) {
        await textLocales.forEach(async (loc) => {
            let titleForLocale: string[] | undefined = titleMap.get(loc);

            if (
                titleForLocale === undefined ||
                titleForLocale[0].length === 0
            ) {
                let locale: LocaleText | undefined = await Locales.loadLocale(
                    loc,
                    false,
                );
                if (!locale) return;

                titleMap.set(loc, [
                    locale.ui.howto.editor.untitledHowToPlaceholder,
                ]);
            }
        });

        return HowTo.mapToMarkupHelper(titleMap, 1);
    }

    // writer functions
    async function writeNewHowTo(publish: boolean) {
        if (!gallery) return;

        let [usedLocales, texts]: [string[], string[]] =
            HowTo.mapToMarkupHelper(multilingualText, prompts.length);
        let [_, titleStrings]: [string[], string[]] =
            await generateTitleStringWithPlaceholders(usedLocales, titles);

        let title: string = titleStrings[0];

        let writeX: number = 0;
        let writeY: number = 0;

        if (publish) {
            [writeX, writeY] = findPlaceToWrite();
        }

        if (!howTo) {
            await HowTos.addHowTo(
                gallery,
                publish,
                writeX,
                writeY,
                allCollaborators,
                title,
                prompts,
                texts,
                usedLocales,
                gallery ? gallery.getHowToReactions() : {},
                notify,
                overwriteAccess,
            );

            // pan the camera to the new how-to
            [cameraX, cameraY] = [-writeX, -writeY];
            show = false;
            editingMode = true;

            // reset form
            howTo = undefined;
            title = '';
            multilingualText = new SvelteMap<string, string[]>(
                $locales
                    .getLocales()
                    .map((loc) => [
                        localeToString(loc),
                        Array(prompts.length).fill(''),
                    ]),
            );
            titles = new SvelteMap<string, string[]>(
                $locales.getLocales().map((loc) => [localeToString(loc), ['']]),
            );
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
                text: texts,
                xcoord: writeX,
                ycoord: writeY,
                collaborators: allCollaborators,
                scopeOverwrite: overwriteAccess,
                locales: usedLocales,
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

    // function submitToGuide() {
    //     if (!howTo) return;

    //     howTo = new HowTo({
    //         ...howTo.getData(),
    //         social: {
    //             ...howTo.getSocial(),
    //             submittedToGuide: true,
    //         },
    //     });

    //     HowTos.updateHowTo(howTo, true);
    // }

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

    function isCreatorCollaboratorViewer(uid: string) {
        return (
            howTo?.hasViewer(uid) ||
            gallery?.hasCurator(uid) ||
            gallery?.hasCreator(uid)
        );
    }

    function updateCollaborators(toChangeID: string, add: boolean) {
        // must be a gallery creator, curator, or how-to viewer to be added
        if (!isCreatorCollaboratorViewer(toChangeID)) return;

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

    export function showPreview() {
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

    // allowing the user to overwrite the gallery's expanded viewing permissions
    let accessToggle: boolean = $state(false);
    let overwriteAccess: boolean = $derived(
        howTo ? howTo.getScopeOverwrite() : false,
    );
</script>

<!-- button to click to open the how-to dialog. if there is a preview (i.e., it is published), use the preview as the button. 
 if not, then if there is a how-to, then this is a draft; use the title as the button
 otherwise, this is the "add new how-to" button; use the "+" as the button -->
{#if preview}
    <Button
        tip={(l) =>
            editingMode
                ? l.ui.howto.editor.editForm.header
                : l.ui.howto.viewer.view.tip}
        action={showPreview}
    >
        {@render preview()}
    </Button>
{:else}
    <Button
        tip={(l) =>
            howTo
                ? l.ui.howto.drafts.tooltip
                : l.ui.howto.editor.newForm.header}
        action={showPreview}
        icon={howTo ? titleInLocale : '+'}
        large={!howTo}
    ></Button>
{/if}

<!-- how-to form -->
<Dialog
    bind:show
    header={editingMode
        ? (l) =>
              !howTo
                  ? l.ui.howto.editor.newForm.header
                  : l.ui.howto.editor.editForm.header
        : undefined}
    explanation={editingMode
        ? (l) =>
              !howTo
                  ? l.ui.howto.editor.newForm.explanation
                  : l.ui.howto.editor.editForm.explanation
        : undefined}
>
    {#if editingMode}
        <Options
            value={localeName}
            options={localeOptions}
            label={(l) => l.ui.howto.editor.localeOptionsLabel}
            change={(value) => {
                if (value) {
                    localeName = value;

                    if (!multilingualText.has(localeName)) {
                        multilingualText.set(
                            localeName,
                            Array(prompts.length).fill(''),
                        );
                    }

                    if (!titles.has(localeName)) {
                        titles.set(localeName, ['']);
                    }
                }
            }}
        />
        <Subheader>
            <TextField
                bind:text={
                    () => {
                        let current: string[] | undefined =
                            titles.get(localeName);
                        return current ? current[0] : '';
                    },
                    (v) => {
                        if (v !== undefined) titles.set(localeName, [v]);
                    }
                }
                description={(l) => l.ui.howto.editor.title.description}
                placeholder={(l) => l.ui.howto.editor.title.placeholder}
                id="howto-title"
            />
        </Subheader>
        {#each prompts as prompt, i (i)}
            <HowToPrompt text={(l) => prompt} />
            <FormattedEditor
                placeholder={(l) => l.ui.howto.editor.editor.placeholder}
                description={(l) => l.ui.howto.editor.editor.description}
                bind:text={
                    () => {
                        let current: string[] | undefined =
                            multilingualText.get(localeName);
                        return current !== undefined ? current[i] : '';
                    },
                    (v) => {
                        let current = multilingualText.get(localeName);

                        if (current === undefined) return;

                        if (current.length === 0) {
                            current.push(v);
                        } else {
                            current[i] = v;
                        }

                        multilingualText.set(localeName, current);
                    }
                }
                id="howto-prompt-{i}"
            />
        {/each}
        <div class="optionsarea">
            {#if collabToggle}
                <div class="optionspanel">
                    <Subheader
                        text={(l) => l.ui.howto.editor.collaborators.header}
                    />
                    <MarkupHTMLView
                        markup={(l) =>
                            l.ui.howto.editor.collaborators.explanation}
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
            {#if accessToggle}
                <div class="optionspanel">
                    <Subheader text={(l) => l.ui.howto.editor.access.header} />
                    <MarkupHTMLView
                        markup={(l) => l.ui.howto.editor.access.explanation}
                    />
                    <Mode
                        modes={(l) => l.ui.howto.editor.accessMode}
                        choice={overwriteAccess ? 0 : 1}
                        select={(num) => (overwriteAccess = num === 0)}
                    />
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
                    <MarkupHTMLView
                        markup={(l) => l.ui.howto.editor.collaborators.header}
                    />
                </Toggle>
                <Toggle
                    tips={(l) => l.ui.howto.editor.accessToggle}
                    on={accessToggle}
                    toggle={() => {
                        accessToggle = !accessToggle;
                    }}
                >
                    <MarkupHTMLView
                        markup={(l) => l.ui.howto.editor.access.header}
                    />
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

                <Button
                    tip={(l) => l.ui.howto.editor.save.tip}
                    label={(l) => l.ui.howto.editor.save.label}
                    action={() => {
                        writeNewHowTo(false);
                    }}
                    active={true}
                />
                <Button
                    tip={(l) => l.ui.howto.editor.post.tip}
                    label={(l) => l.ui.howto.editor.post.label}
                    action={() => {
                        writeNewHowTo(true);
                    }}
                    active={true}
                    submit={true}
                />
            </div>
        </div>
    {:else if howTo && howTo.isPublished() && $user && isCreatorCollaboratorViewer($user.uid)}
        <Header><MarkupHTMLView markup={titleInLocale} /></Header>
        <div class="creatorlist">
            <Labeled label={(l) => l.ui.howto.viewer.collaborators}>
                <CreatorList
                    anonymize={false}
                    editable={false}
                    uids={allCollaborators}
                />
            </Labeled>
        </div>
        <div class="toolbar">
            {#if howTo.isCreatorCollaborator($user.uid) || gallery?.hasCurator($user.uid)}
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
                        if (gallery && howTo) {
                            await HowTos.deleteHowTo(howToId, gallery);
                            show = false;
                        }
                    }}
                    label={(l) => l.ui.howto.viewer.delete.prompt}
                />
                <!-- Removing this button since we do not have a corresponding design yet. 
                 Filed as GitHub issue #906: https://github.com/wordplaydev/wordplay/issues/906 -->
                <!-- <Button
                    tip={(l) =>
                        isSubmitted
                            ? l.ui.howto.viewer.submitToGuide.alreadySubmitted
                                  .tip
                            : l.ui.howto.viewer.submitToGuide.submit.tip}
                    label={(l) =>
                        isSubmitted
                            ? l.ui.howto.viewer.submitToGuide.alreadySubmitted
                                  .label
                            : l.ui.howto.viewer.submitToGuide.submit.label}
                    active={!isSubmitted}
                    action={() => {
                        submitToGuide();
                    }}
                /> -->
            {/if}
            <Button
                tip={(l) =>
                    userHasBookmarked
                        ? l.ui.howto.bookmarks.alreadyBookmarked.tip
                        : l.ui.howto.bookmarks.canBookmark.tip}
                label={(l) =>
                    userHasBookmarked
                        ? l.ui.howto.bookmarks.alreadyBookmarked.label
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
        </div>
        <div class="howtosplitview">
            <div class="splitside" id="howtoview">
                {#each howTo.getText() as markup, i (i)}
                    <HowToPrompt text={(l) => prompts[i]} />
                    <MarkupHTMLView {markup} />
                {/each}
            </div>
            <div class="splitside" id="howtointeractions">
                <HowToPrompt text={(l) => l.ui.howto.viewer.reactionsPrompt} />
                {#each reactionButtons as reaction, i (i)}
                    <Button
                        tip={(l) => reaction.tip}
                        label={(l) =>
                            reaction.label +
                            ' ' +
                            (howTo ? howTo.getNumReactions(reaction.label) : 0)}
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
                    {galleryID}
                    {howTo}
                />
            </div>
        </div>
    {:else if howTo && (!$user || !isCreatorCollaboratorViewer($user.uid))}
        <Header><MarkupHTMLView markup={titleInLocale} /></Header>
        <div class="creatorlist">
            <Labeled label={(l) => l.ui.howto.viewer.collaborators}>
                <CreatorList
                    anonymize={false}
                    editable={false}
                    uids={allCollaborators}
                />
            </Labeled>
        </div>
        <hr />

        {#each howTo.getText() as markup, i (i)}
            <HowToPrompt text={(l) => prompts[i]} />
            <MarkupHTMLView {markup} />
        {/each}
    {:else if howTo}
        <Header>
            <MarkupHTMLView markup={titleInLocale} />
        </Header>
        <div class="creatorlist">
            <Labeled label={(l) => l.ui.howto.viewer.collaborators}>
                <CreatorList
                    anonymize={false}
                    editable={false}
                    uids={allCollaborators}
                />
                {#if !isPublished}
                    <MarkupHTMLView markup={(l) => l.ui.howto.drafts.note} />
                {/if}
            </Labeled>
        </div>
        <div class="toolbar">
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
                    if (gallery && howTo) {
                        await HowTos.deleteHowTo(howToId, gallery);
                        show = false;
                    }
                }}
                label={(l) => l.ui.howto.viewer.delete.prompt}
            />
        </div>

        {#each howTo.getText() as markup, i (i)}
            <HowToPrompt text={(l) => prompts[i]} />
            <MarkupHTMLView {markup} />
        {/each}
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
        justify-content: space-between;
        flex-wrap: wrap;
    }

    .toolbar-left,
    .toolbar-right {
        display: flex;
        gap: var(--wordplay-spacing);
    }

    .howtosplitview {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--wordplay-spacing);
        height: 100%;
        overflow: hidden;
    }

    .splitside {
        height: 100%;
        max-height: 100%;
        width: 100%;
        padding: var(--wordplay-spacing);
        overflow-y: auto;
        overscroll-behavior-y: contain;
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
