<script lang="ts">
    import { page } from '$app/state';
    import Header from '@components/app/Header.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import Checkbox from '@components/widgets/Checkbox.svelte';
    import Dialog from '@components/widgets/Dialog.svelte';
    import FormattedEditor from '@components/widgets/FormattedEditor.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import { HowTos, locales } from '@db/Database';
    import HowTo from '@db/howtos/HowToDatabase.svelte';
    import { docToMarkup } from '@locale/LocaleText';
    import HowToPrompt from './HowToPrompt.svelte';

    // defining props
    interface Props {
        editingMode: boolean; // true if editing, false if viewing
        howTo?: HowTo; // undefined if creating a brand new how-to
        centerX?: number;
        centerY?: number;
    }

    let {
        editingMode,
        howTo = $bindable(undefined),
        centerX = $bindable(0),
        centerY = $bindable(0),
    }: Props = $props();

    // utility variables
    let reactionButtons = $locales.get((l) => l.ui.howto.reactions);
    let howToId: string = $derived(howTo?.getHowToId() ?? '');
    const galleryID: string = decodeURI(page.params.galleryid);

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
    let text: string[] = $derived(howTo ? howTo.getText() : ['']);
    let prompts: string[] = $derived(
        howTo
            ? howTo.getGuidingQuestions()
            : [$locales.get((l) => l.ui.howto.newHowTo.prompt)],
    );
    let title: string = $derived(howTo ? howTo.getTitle() : '');

    async function writeNewHowTo(publish: boolean) {
        if (!howTo) {
            let returnValue = await HowTos.addHowTo(
                galleryID,
                publish,
                publish ? centerX : 0,
                publish ? centerY : 0,
                [],
                title,
                prompts,
                text,
                ['en-US'],
                reactionButtons.map((b) => b.label),
            );

            howTo = returnValue ? returnValue : undefined;
            show = false;
            editingMode = true;
        } else {
            howTo = new HowTo({
                ...howTo.getData(),
                published: publish,
                title: title,
                text: text,
            });

            HowTos.updateHowTo(howTo, true);
            editingMode = false;
        }
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
</script>

<Dialog
    bind:show
    header={(l) =>
        editingMode
            ? !howTo
                ? l.ui.howto.newHowTo.newForm.header
                : l.ui.howto.newHowTo.editForm.header
            : title}
    explanation={(l) =>
        editingMode
            ? !howTo
                ? l.ui.howto.newHowTo.newForm.explanation
                : l.ui.howto.newHowTo.editForm.explanation
            : l.ui.howto.newHowTo.editForm.explanation}
    button={{
        tip: (l) =>
            editingMode
                ? !howTo
                    ? l.ui.howto.newHowTo.newForm.header
                    : l.ui.howto.newHowTo.editForm.header
                : l.ui.howto.viewHowTo.view.tip,
        icon: editingMode ? (!howTo ? '+' : '✏️') : title,
        large: !howTo,
    }}
>
    {#if editingMode}
        <Header>
            <TextField
                bind:text={title}
                description={(l) => l.ui.howto.newHowTo.title.description}
                placeholder={(l) => l.ui.howto.newHowTo.title.placeholder}
                id="howto-title"
            />
        </Header>

        {#each prompts as prompt, i (i)}
            <HowToPrompt text={(l) => prompt} />
            <FormattedEditor
                placeholder={(l) => l.ui.howto.newHowTo.editorPlaceholder}
                description={(l) => l.ui.howto.newHowTo.editorDescription}
                bind:text={text[i]}
                id="howto-prompt-{i}"
            />
        {/each}

        <div class="toolbar">
            {#if !howTo}
                <label for="notify-checked">
                    <Checkbox
                        id="notify-checked"
                        bind:on={notify}
                        changed={(value) => (notify = value ?? true)}
                        label={(l) => l.ui.howto.newHowTo.notificationOptOut}
                    />
                    <LocalizedText
                        path={(l) => l.ui.howto.newHowTo.notificationOptOut}
                    />
                </label>
            {/if}
            {#if !howTo?.isPublished()}
                <Button
                    tip={(l) => l.ui.howto.newHowTo.save.tip}
                    label={(l) => l.ui.howto.newHowTo.save.label}
                    action={() => {
                        writeNewHowTo(false);
                    }}
                    active={true}
                />
            {/if}
            <Button
                tip={(l) => l.ui.howto.newHowTo.post.tip}
                label={(l) => l.ui.howto.newHowTo.post.label}
                action={() => {
                    writeNewHowTo(true);
                }}
                active={true}
                submit={true}
            />
        </div>
    {:else if howTo}
        <div class="howtosplitview">
            <div>
                <div class="toolbar">
                    {#if $user && howTo.isCreatorCollaborator($user.uid)}
                        <Button
                            tip={(l) => l.ui.howto.viewHowTo.edit.tip}
                            label={(l) => l.ui.howto.viewHowTo.edit.label}
                            active={true}
                            action={() => {
                                editingMode = true;
                            }}
                        />
                        {#if isPublished}
                            <Button
                                tip={(l) =>
                                    howTo && howTo.getSubmittedToGuide()
                                        ? l.ui.howto.viewHowTo.alreadySubmitted
                                              .tip
                                        : l.ui.howto.viewHowTo.submit.tip}
                                label={(l) =>
                                    howTo && howTo.getSubmittedToGuide()
                                        ? l.ui.howto.viewHowTo.alreadySubmitted
                                              .label
                                        : l.ui.howto.viewHowTo.submit.label}
                                active={!howTo.getSubmittedToGuide()}
                                action={() => {
                                    submitToGuide();
                                }}
                            />
                        {/if}
                    {/if}
                    {#if isPublished}
                        <Button
                            tip={(l) => l.ui.howto.viewHowTo.copyLink.tip}
                            label={(l) => l.ui.howto.viewHowTo.copyLink.label}
                            active={true}
                            action={async () => {
                                await navigator.clipboard.writeText(
                                    `${window.location.origin}/gallery/${galleryID}/howto?id=${howToId}`,
                                );
                            }}
                        />
                        <Button
                            tip={(l) =>
                                userHasBookmarked
                                    ? l.ui.howto.viewHowTo.alreadyBookmarked.tip
                                    : l.ui.howto.viewHowTo.canBookmark.tip}
                            label={(l) =>
                                userHasBookmarked
                                    ? l.ui.howto.viewHowTo.alreadyBookmarked
                                          .label
                                    : l.ui.howto.viewHowTo.canBookmark.label}
                            active={true}
                            background={userHasBookmarked}
                            action={() => {
                                addRemoveBookmark();
                            }}
                        />
                    {:else}
                        <p
                            >{$locales.get(
                                (l) => l.ui.howto.viewHowTo.draftNote,
                            )}</p
                        >
                    {/if}
                </div>

                {#each prompts as prompt, i (i)}
                    <HowToPrompt text={(l) => prompt} />
                    <MarkupHTMLView markup={text[i]} />
                {/each}
            </div>
            {#if isPublished}
                <div>
                    <HowToPrompt
                        text={(l) => l.ui.howto.viewHowTo.reactionPrompt}
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
                    <HowToPrompt
                        text={(l) => l.ui.howto.viewHowTo.usedPrompt}
                    />
                    <MarkupHTMLView
                        inline
                        markup={docToMarkup(
                            $locales.get(
                                (l) => l.ui.howto.viewHowTo.usedCountDisplay,
                            ),
                        ).concretize($locales, [
                            howTo.getUsedByProjects().length,
                        ]) ?? ''}
                    />
                    <HowToPrompt
                        text={(l) => l.ui.howto.viewHowTo.chatPrompt}
                    />
                </div>
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
    }

    .howtosplitview {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
    }
</style>
