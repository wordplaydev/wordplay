<script lang="ts">
    import { page } from '$app/state';
    import { toClipboard } from '@components/editor/commands/Clipboard';
    import ChatView from '@components/app/chat/ChatView.svelte';
    import Header from '@components/app/Header.svelte';
    import Notice from '@components/app/Notice.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser } from '@components/project/Contexts';
    import CreatorList from '@components/project/CreatorList.svelte';
    import Button from '@components/widgets/Button.svelte';
    import ConfirmButton from '@components/widgets/ConfirmButton.svelte';
    import Dialog from '@components/widgets/Dialog.svelte';
    import Labeled from '@components/widgets/Labeled.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Mode from '@components/widgets/Mode.svelte';
    import Options, { type Option } from '@components/widgets/Options.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import Toggle from '@components/widgets/Toggle.svelte';
    import type Chat from '@db/chats/ChatDatabase.svelte';
    import type { Creator } from '@db/creators/CreatorDatabase';
    import {
        Chats,
        Creators,
        DB,
        disconnected,
        Galleries,
        HowTos,
        Locales,
        locales,
    } from '@db/Database';
    import { enqueuePreviewCompute } from '@db/projects/previewQueue';
    import Project from '@db/projects/Project';
    import Source from '@nodes/Source';
    import { toMarkup } from '@parser/toMarkup';
    import UnicodeString from '@unicode/UnicodeString';
    import { pickPreviewExample } from '@concepts/pickPreviewExample';
    import type Gallery from '@db/galleries/Gallery';
    import type HowTo from '@db/howtos/HowToDatabase.svelte';
    import type Locale from '@locale/Locale';
    import { localeToString, stringToLocale } from '@locale/Locale';
    import {
        getLanguageLocalDescription,
        type LocaleText,
    } from '@locale/LocaleText';
    import type { ButtonText } from '@locale/UITexts';
    import { onDestroy, onMount, untrack, type Snippet } from 'svelte';
    import { SvelteMap, SvelteSet } from 'svelte/reactivity';
    import { findHowToPlacement } from './HowToMovement';
    import HowToPrompt from './HowToPrompt.svelte';
    import HowToTranslationEditor from './HowToTranslationEditor.svelte';
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
    $effect(() => {
        if (galleryID) {
            Galleries.get(galleryID).then((g) => {
                if (g) {
                    gallery = g;
                    galleryQuestions = gallery.getHowToGuidingQuestions();
                }
            });
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
    let isPublic: boolean = $derived(howTo ? howTo.isPublic() : false);

    // prompts and editing
    let allCollaborators: string[] = $state([]);

    $effect(() => {
        if (howTo) {
            // Dedupe: the stored `collaborators` field may already contain
            // the creator (legacy data + earlier round-trips), and without
            // deduping here, autosave would append another creator entry
            // on every save.
            const creator = howTo.getCreator();
            const collabs = howTo
                .getCollaborators()
                .filter((uid) => uid !== creator);
            allCollaborators = [...collabs, creator];
        } else if ($user) {
            allCollaborators = [$user.uid];
        }
    });

    let prompts: string[] = $derived(
        howTo ? howTo.getGuidingQuestions() : galleryQuestions,
    );

    // locales
    // Initial value: the first of the user's preferred locales that the
    // how-to also has; otherwise the how-to's first locale; otherwise the
    // user's current locale.
    //
    // Latched after first initialization so that subsequent `howTo`
    // reassignments (e.g., autosave round-trips, snapshot listeners) don't
    // overwrite a locale the student manually picked from the dropdown.
    let localeName: string = $state('');
    let localeNameInitialized = false;
    $effect(() => {
        if (localeNameInitialized) return;
        if (howTo) {
            for (const locale of $locales.getPreferredLocales()) {
                if (howTo.getLocales().includes(localeToString(locale))) {
                    localeName = localeToString(locale);
                    localeNameInitialized = true;
                    return;
                }
            }
            localeName = howTo.getLocales()[0] ?? $locales.getLocaleString();
            localeNameInitialized = true;
        } else {
            localeName = $locales.getLocaleString();
            localeNameInitialized = true;
        }
    });

    let localeList: SvelteSet<string> = $derived(
        new SvelteSet<string>([
            ...$locales.getLocales().map((l) => localeToString(l)),
            ...(howTo ? howTo.getLocales() : []),
        ]),
    );

    // options for the locale selector drop-down menu
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
    let titles: SvelteMap<string, string> = $state(
        new SvelteMap<string, string>(),
    );
    let titleInLocale: string = $derived(
        howTo ? howTo.getTitleInLocale($locales.getLocaleString()) : '',
    );

    // a list of text, formatted as ¶...¶/locale¶...¶/locale
    // each entry of the list corresponds to one of the prompts
    let multilingualText: string[] = $state([]);

    // list of locales used in the how-to thus far
    // we pull from the how-to's list of locales, if the how-to exists, otherwise empty (since no text yet!)
    let usedLocales: SvelteSet<string> = $state(new SvelteSet<string>());

    onMount(() => {
        titles = howTo
            ? howTo.getTitleAsMap()
            : new SvelteMap<string, string>([[$locales.getLocaleString(), '']]);

        if (prompts.length > 0) {
            multilingualText = howTo
                ? howTo.getText()
                : Array(prompts.length).fill('');
        }

        if (howTo) {
            usedLocales = new SvelteSet<string>(howTo.getLocales());
        }
    });
    // Initialize multilingualText for the "+ new" form once prompts are
    // available (galleryQuestions may arrive after mount). Guarded on
    // .length === 0 so it never overwrites a user's in-progress edits if
    // the howTo prop transiently becomes undefined.
    $effect(() => {
        if (!howTo && prompts.length > 0 && multilingualText.length === 0) {
            multilingualText = Array(prompts.length).fill('');
        }
    });

    // -- Autosave ---------------------------------------------------------
    // Existing drafts autosave on a short debounce so students don't lose
    // text between explicit saves. The new-howTo "+" form is not autosaved
    // (it doesn't have a doc yet; "Save as draft" creates one).
    const AUTOSAVE_DEBOUNCE_MS = 1500;
    const SAVED_FADE_MS = 2000;

    let autosaveStatus: 'idle' | 'pending' | 'saving' | 'saved' | 'error' =
        $state('idle');
    let autosaveTimer: ReturnType<typeof setTimeout> | undefined;
    let savedFadeTimer: ReturnType<typeof setTimeout> | undefined;
    /** Latch initial sync from onMount so we don't autosave just because
     *  we populated titles/multilingualText/usedLocales on first render. */
    let autosaveArmed = false;

    async function computeAndSavePreview(target: HowTo) {
        const joined = target
            .getTextInLocale($locales.getLocaleString())
            .join('\n\n');
        const [markup, spaces] = toMarkup(joined);
        const example = pickPreviewExample(markup);
        if (!example) {
            const rep = markup.getRepresentativeText();
            const text = rep
                ? new UnicodeString(rep).substring(0, 1).toString()
                : '—';
            await HowTos.setAutoPreview(target.getHowToId(), {
                text,
                foreground: null,
                background: null,
                face: null,
                characterName: null,
            });
            return;
        }
        const project = Project.make(
            null,
            'example',
            new Source('example', [example.program, spaces]),
            [],
            $locales.getLocales(),
        );
        const extracted = await enqueuePreviewCompute(project, $locales, DB);
        await HowTos.setAutoPreview(target.getHowToId(), extracted);
    }

    async function persistChanges() {
        if (!howTo || !gallery) return;
        autosaveStatus = 'saving';
        try {
            const title = await generateTitleStringWithPlaceholders(
                usedLocales,
                titles,
            );
            howTo = howTo.withFields({
                title,
                text: multilingualText,
                collaborators: allCollaborators,
                scopeOverwrite: overwriteAccess,
                locales: [...usedLocales],
                isPublic,
                social: { notifySubscribers: notify },
            });
            await HowTos.updateHowTo(howTo, true);
            computeAndSavePreview(howTo).catch(() => {});
            autosaveStatus = 'saved';
            if (savedFadeTimer !== undefined) clearTimeout(savedFadeTimer);
            savedFadeTimer = setTimeout(() => {
                if (autosaveStatus === 'saved') autosaveStatus = 'idle';
            }, SAVED_FADE_MS);
        } catch (err) {
            console.error('How-to autosave failed', err);
            autosaveStatus = 'error';
        }
    }

    function scheduleAutosave() {
        if (!howTo) return;
        if (autosaveTimer !== undefined) clearTimeout(autosaveTimer);
        autosaveStatus = 'pending';
        autosaveTimer = setTimeout(() => {
            autosaveTimer = undefined;
            persistChanges();
        }, AUTOSAVE_DEBOUNCE_MS);
    }

    function flushAutosave() {
        if (autosaveTimer !== undefined) {
            clearTimeout(autosaveTimer);
            autosaveTimer = undefined;
            persistChanges();
        }
    }

    // Trigger autosave when the editor's content state changes.
    // Deliberately narrow: only the fields a student edits in the body of
    // the form. Collaborator/access changes go through their own explicit
    // updateHowTo paths and would cause feedback loops if tracked here.
    $effect(() => {
        // Read each reactive source to register dependencies.
        for (const t of multilingualText) void t;
        for (const [, v] of titles) void v;
        for (const l of usedLocales) void l;

        // `howTo` is only an existence guard here — read it UNTRACKED so this
        // effect fires on content edits, not when persistChanges() reassigns
        // `howTo` after a save. Tracking it caused an infinite autosave loop
        // (save → new howTo object → effect re-runs → reschedules → save …),
        // which also spammed the local-cache write.
        if (!autosaveArmed || !untrack(() => howTo)) return;
        scheduleAutosave();
    });

    // After mount, allow autosave to fire on subsequent changes.
    onMount(() => {
        queueMicrotask(() => {
            autosaveArmed = true;
        });
    });

    // If the dialog closes (including via clickOutside) with a pending
    // debounce, flush so we don't lose those edits.
    $effect(() => {
        if (!show) flushAutosave();
    });

    onDestroy(() => {
        flushAutosave();
        if (savedFadeTimer !== undefined) clearTimeout(savedFadeTimer);
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
        )
            .map(([emoji, description]) => ({
                label: emoji,
                tip: description,
            }))
            .sort((a, b) => a.label.localeCompare(b.label)),
    );

    function findPlaceToWrite(): [number, number] {
        // Probe size matches a how-to preview tile (~120px) so the
        // placement search reserves enough room with the buffer.
        return findHowToPlacement(
            notPermittedAreas,
            -cameraX,
            -cameraY,
            120,
            120,
        );
    }

    /** Add placeholder titles for any locales that have text but no title */
    async function generateTitleStringWithPlaceholders(
        textLocales: SvelteSet<string>,
        titleMap: SvelteMap<string, string>,
    ): Promise<string> {
        let returnString: string = titleMap
            .entries()
            .reduce((acc, [locale, text]) => {
                return acc + (text.length === 0 ? '' : `¶${text}¶/${locale}`);
            }, '');

        await textLocales.forEach(async (loc) => {
            let titleForLocale: string | undefined = titleMap.get(loc);

            if (titleForLocale === undefined || titleForLocale.length === 0) {
                let locale: LocaleText | undefined = await Locales.loadLocale(
                    loc,
                    false,
                );
                if (!locale) return;

                returnString += `¶${locale.ui.howto.editor.untitledHowToPlaceholder}¶/${loc}`;
            }
        });

        return returnString;
    }

    // writer functions
    async function writeNewHowTo(publish: boolean) {
        if (!gallery) return;

        if (!howTo) {
            // Creating a brand-new how-to from the "+" form.
            const title: string = await generateTitleStringWithPlaceholders(
                usedLocales,
                titles,
            );
            let writeX = 0;
            let writeY = 0;
            if (publish) [writeX, writeY] = findPlaceToWrite();

            const created = await HowTos.addHowTo(
                gallery,
                publish,
                writeX,
                writeY,
                allCollaborators,
                title,
                prompts,
                multilingualText,
                [...usedLocales],
                gallery ? gallery.getHowToReactions() : {},
                notify,
                overwriteAccess,
                isPublic,
            );
            if (created) computeAndSavePreview(created).catch(() => {});

            [cameraX, cameraY] = [-writeX, -writeY];
            show = false;
            editingMode = true;

            // reset form
            howTo = undefined;
            multilingualText = [];
            titles = new SvelteMap<string, string>([
                [$locales.getLocaleString(), ''],
            ]);
            allCollaborators = [];
            return;
        }

        // Existing how-to: any pending debounced autosave is about to be
        // superseded by this explicit save; cancel it.
        if (autosaveTimer !== undefined) clearTimeout(autosaveTimer);
        autosaveTimer = undefined;

        const title: string = await generateTitleStringWithPlaceholders(
            usedLocales,
            titles,
        );
        let [writeX, writeY] = howTo.getCoordinates();
        // Only reposition (and pan to) the how-to when it's transitioning
        // from draft to published. Drafts don't render on the canvas, so
        // repositioning them on every "Save as draft" was disorienting
        // and contributed to the perception that things had moved/lost.
        const repositioning = publish && !isPublished;
        if (repositioning) [writeX, writeY] = findPlaceToWrite();

        autosaveStatus = 'saving';
        try {
            howTo = howTo.withFields({
                published: publish,
                title,
                text: multilingualText,
                xcoord: writeX,
                ycoord: writeY,
                collaborators: allCollaborators,
                scopeOverwrite: overwriteAccess,
                locales: [...usedLocales],
                isPublic,
                social: { notifySubscribers: notify },
            });
            if (repositioning) [cameraX, cameraY] = [-writeX, -writeY];
            await HowTos.updateHowTo(howTo, true);
            computeAndSavePreview(howTo).catch(() => {});

            autosaveStatus = 'saved';
            if (savedFadeTimer !== undefined) clearTimeout(savedFadeTimer);
            savedFadeTimer = setTimeout(() => {
                if (autosaveStatus === 'saved') autosaveStatus = 'idle';
            }, SAVED_FADE_MS);

            // Only exit editing mode when publishing — "Save as draft"
            // should keep the student in the editor (autosave + explicit
            // save both leave the editor open).
            if (publish) editingMode = false;
        } catch (err) {
            console.error('How-to save failed', err);
            autosaveStatus = 'error';
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

        howTo = howTo.withFields({
            social: { bookmarkers: newBookmarkers },
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

        howTo = howTo.withFields({ social: { reactions: newReactions } });

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

        howTo = howTo.withFields({ collaborators: allCollaborators });

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
        // When the how-to changes, get the chat and subscribe to future updates.
        if (!howTo) return;
        const currentHowTo = howTo;
        const howToID = currentHowTo.getHowToId();
        Chats.getChatHowTo(currentHowTo).then((retrievedChat) => {
            chat = retrievedChat;
        });
        if (howToID)
            return Chats.onChatUpdated(howToID, (updated) => {
                chat = updated;
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

            howTo = howTo.withFields({
                social: {
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
    wide
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

                    if (!titles.has(localeName)) {
                        titles.set(localeName, '');
                    }
                }
            }}
        />
        <Subheader>
            <TextField
                bind:text={
                    () => {
                        let current: string | undefined =
                            titles.get(localeName);
                        return current ?? '';
                    },
                    (v) => {
                        if (v !== undefined) titles.set(localeName, v);
                    }
                }
                description={(l) => l.ui.howto.editor.title.description}
                placeholder={(l) => l.ui.howto.editor.title.placeholder}
                id="howto-title"
            />
        </Subheader>
        {#if prompts.length === 0}
            <Notice text={(l) => l.ui.howto.editor.noGuidingQuestions} />
        {:else}
            {#each prompts as prompt, i (i)}
                <HowToPrompt text={(l) => prompt} />
                <HowToTranslationEditor
                    id={i}
                    currentLocale={localeName}
                    bind:usedLocales
                    bind:markupText={multilingualText[i]}
                />
            {/each}
        {/if}
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
                    <MarkupHTMLView
                        markup={(l) => l.ui.howto.editor.publicExplanation}
                    />
                    <Mode
                        modes={(l) => l.ui.howto.editor.publicMode}
                        choice={isPublic ? 1 : 0}
                        select={(num) => (isPublic = num === 1)}
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

                {#if howTo && autosaveStatus !== 'idle'}
                    <span
                        class="autosave-status"
                        class:autosave-error={autosaveStatus === 'error'}
                    >
                        {#if autosaveStatus === 'pending' || autosaveStatus === 'saving'}
                            <LocalizedText path={(l) => l.ui.save.saving} />
                        {:else if autosaveStatus === 'saved'}
                            <LocalizedText path={(l) => l.ui.save.saved} />
                        {:else if autosaveStatus === 'error'}
                            <LocalizedText path={(l) => l.ui.save.unsaved} />
                        {/if}
                    </span>
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
        <div class="howtometadata">
            <Labeled label={(l) => l.ui.howto.viewer.collaborators}>
                <CreatorList
                    anonymize={false}
                    editable={false}
                    uids={allCollaborators}
                />
            </Labeled>
            <Labeled label={(l) => l.ui.howto.viewer.reactionsPrompt} column>
                <div class="reactions">
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
                </div>
            </Labeled>
            <HowToUsedBy bind:howTo compact />
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
                    enabled={!$disconnected}
                    action={async () => {
                        // Only close the editor once the delete actually
                        // succeeded; on failure deleteHowTo raises the banner
                        // and the how-to stays open so the user can retry.
                        if (
                            gallery &&
                            howTo &&
                            (await HowTos.deleteHowTo(howToId, gallery))
                        )
                            show = false;
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
                    await toClipboard(
                        `${window.location.origin}/gallery/${galleryID}/howto?id=${howToId}`,
                    );
                }}
            />
        </div>
        <div class="how-to-text" id="howtoview">
            {#each howTo.getText() as markup, i (i)}
                <HowToPrompt text={(l) => prompts[i]} />
                <MarkupHTMLView {markup} />
            {/each}
        </div>
        <div class="how-to-social" id="howtointeractions">
            <HowToPrompt text={(l) => l.ui.howto.viewer.chatPrompt} />
            <div class="how-to-chat">
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
                enabled={!$disconnected}
                action={async () => {
                    // Only close once the delete actually succeeded.
                    if (
                        gallery &&
                        howTo &&
                        (await HowTos.deleteHowTo(howToId, gallery))
                    )
                        show = false;
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
        align-items: center;
    }

    .autosave-status {
        font-size: var(--wordplay-small-font-size);
        color: var(--wordplay-inactive-color);
        font-style: italic;
    }

    .autosave-status.autosave-error {
        color: var(--wordplay-error);
        font-style: normal;
    }

    /* Metadata row below the header: written-by, reactions, and used-by,
       wrapping so the row stays compact and lets the content below use the
       full dialog width. */
    .howtometadata {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
        column-gap: calc(2 * var(--wordplay-spacing));
        align-items: start;
        margin: var(--wordplay-spacing);
    }

    .reactions {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
    }

    /* Full-width content so wide (especially blocks-mode) example code can
       scroll horizontally inside ExampleUI instead of being clipped by a
       narrow column. min-width: 0 lets the example's own overflow engage. */
    .how-to-text,
    .how-to-social {
        width: 100%;
        min-width: 0;
        padding: var(--wordplay-spacing);
    }

    .how-to-chat {
        width: 100%;
        max-height: 50vh;
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
