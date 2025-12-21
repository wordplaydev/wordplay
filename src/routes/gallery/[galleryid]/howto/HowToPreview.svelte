<script lang="ts">
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import Dialog from '@components/widgets/Dialog.svelte';
    import { HowTos, locales } from '@db/Database';
    import HowTo from '@db/howtos/HowToDatabase.svelte';
    import { docToMarkup } from '@locale/LocaleText';
    import HowToForm from './HowToForm.svelte';
    import HowToPrompt from './HowToPrompt.svelte';

    interface Props {
        howToId: string;
        cameraX: number;
        cameraY: number;
        childMoving: boolean;
        draftsArea?: DOMRect | undefined;
        changedLocation: boolean;
    }

    let {
        howToId,
        cameraX,
        cameraY,
        childMoving = $bindable(),
        draftsArea = undefined,
        changedLocation = $bindable(),
    }: Props = $props();

    const user = getUser();

    let howTo: HowTo | undefined = $state();

    $effect(() => {
        HowTos.getHowTo(howToId).then((ht) => {
            if (ht) howTo = ht;
            else howTo = undefined;
        });
    });

    let title: string = $derived(howTo?.getTitle() ?? '');
    let text: string[] = $derived(howTo?.getText() ?? []);
    let xcoord: number = $derived(howTo?.getCoordinates()[0] ?? 0);
    let ycoord: number = $derived(howTo?.getCoordinates()[1] ?? 0);
    let preview: string = $derived(text.at(0)?.charAt(0) || '');
    let reactions: Record<string, string[]> = $derived(
        howTo ? howTo.getUserReactions() : {},
    );
    let userHasBookmarked: boolean = $derived(
        $user && howTo ? howTo.getBookmarkers().includes($user.uid) : false,
    );

    let isPublished: boolean = $derived(howTo ? howTo.isPublished() : false);
    childMoving = false;
    let thisChildMoving = false;

    let renderX: number = $derived(xcoord + (isPublished ? cameraX : 0));
    let renderY: number = $derived(ycoord + (isPublished ? cameraY : 0));

    // Drag and drop function referenced from: https://svelte.dev/playground/7d674cc78a3a44beb2c5a9381c7eb1a9?version=5.46.0
    function onMouseDown() {
        childMoving = true;
        thisChildMoving = true;
    }

    function onMouseMove(e: MouseEvent) {
        if (thisChildMoving) {
            xcoord += e.movementX;
            ycoord += e.movementY;
        }
    }

    function onMouseUp(event: MouseEvent) {
        childMoving = false;

        if (thisChildMoving) {
            thisChildMoving = false;

            if (!howTo) return;

            let published = howTo.isPublished();

            // if is a draft and moved outside of the drafts space, then publish it
            if (!published) {
                const selfArea = document
                    .getElementById(`howto-${howToId}`)
                    ?.getBoundingClientRect();

                if (
                    draftsArea &&
                    selfArea &&
                    // check all corners of the preview are outside of the drafts area
                    (draftsArea.left > selfArea.right ||
                        draftsArea.right < selfArea.left ||
                        draftsArea.top > selfArea.bottom ||
                        draftsArea.bottom < selfArea.top)
                ) {
                    published = true;
                    console.log(
                        'Publishing how-to as it was moved out of drafts area',
                        event.clientX,
                        event.clientY,
                        cameraX,
                        cameraY,
                    );
                    xcoord = event.clientX - cameraX;
                    ycoord = event.clientY - cameraY;
                }
            }

            HowTos.updateHowTo(
                new HowTo({
                    ...howTo.getData(),
                    xcoord: xcoord,
                    ycoord: ycoord,
                    published: published,
                }),
                true,
            );

            changedLocation = true;
        }
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

        HowTos.updateHowTo(
            new HowTo({
                ...howTo.getData(),
                reactions: newReactions,
            }),
            true,
        );
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

        HowTos.updateHowTo(
            new HowTo({
                ...howTo.getData(),
                bookmarkers: newBookmarkers,
            }),
            true,
        );
    }

    let show: boolean = $state(false);
    let reactionButtons = $locales.get((l) => l.ui.howto.reactions);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
{#if howTo}
    <div
        class="howto"
        style="--renderedX: {renderX}px; --renderedY: {renderY}px; --positioning: {isPublished
            ? 'absolute'
            : 'relative'};"
        onmousedown={onMouseDown}
        id="howto-{howToId}"
    >
        <Dialog
            bind:show
            header={(l) => title}
            explanation={(l) => l.ui.howto.newHowTo.editForm.explanation}
            button={{
                tip: (l) => l.ui.howto.viewHowTo.view.tip,
                icon: title,
            }}
        >
            <div class="howtosplitview">
                <div>
                    <div class="toolbar">
                        {#if $user && howTo.isCreatorCollaborator($user.uid)}
                            <HowToForm
                                howToId={howTo.getHowToId()}
                                addedNew={false}
                            />
                            {#if isPublished}
                                <Button
                                    tip={(l) => l.ui.howto.viewHowTo.submit.tip}
                                    label={(l) =>
                                        l.ui.howto.viewHowTo.submit.label}
                                    active={true}
                                    action={() => {}}
                                />
                            {/if}
                        {/if}
                        {#if isPublished}
                            <Button
                                tip={(l) =>
                                    userHasBookmarked
                                        ? l.ui.howto.viewHowTo.alreadyBookmarked
                                              .tip
                                        : l.ui.howto.viewHowTo.canBookmark.tip}
                                label={(l) =>
                                    userHasBookmarked
                                        ? l.ui.howto.viewHowTo.alreadyBookmarked
                                              .label
                                        : l.ui.howto.viewHowTo.canBookmark
                                              .label}
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
                    <HowToPrompt text={(l) => l.ui.howto.newHowTo.prompt} />

                    <MarkupHTMLView markup={(l) => text} />
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
                                    ? reactions[reaction.label].includes(
                                          $user.uid,
                                      )
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
                                    (l) =>
                                        l.ui.howto.viewHowTo.usedCountDisplay,
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
        </Dialog>
        <div class="howtopreview">
            <p>{preview}</p>
        </div>
    </div>
{/if}
<svelte:window on:mouseup={onMouseUp} on:mousemove={onMouseMove} />

<style>
    .howto {
        overflow: hidden;
        position: var(--positioning);
        left: var(--renderedX);
        top: var(--renderedY);
        width: fit-content;
        height: fit-content;
        cursor: grab;
    }
    .howtopreview {
        border: 1px solid var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        padding: var(--wordplay-spacing);
        aspect-ratio: 1 / 1;
        width: fit-content;
        height: fit-content;
        font-size: 2rem;
    }
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
        width: 100%;
        flex-wrap: wrap;
    }
    .howtosplitview {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
    }
</style>
