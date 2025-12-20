<script lang="ts">
    import Subheader from '@components/app/Subheader.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import Dialog from '@components/widgets/Dialog.svelte';
    import { HowTos, locales } from '@db/Database';
    import HowTo from '@db/howtos/HowToDatabase.svelte';
    import { docToMarkup } from '@locale/LocaleText';

    interface Props {
        howToId: string;
    }

    let { howToId }: Props = $props();

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

    let moving: boolean = false;

    // Drag and drop function referenced from: https://svelte.dev/playground/7d674cc78a3a44beb2c5a9381c7eb1a9?version=5.46.0
    function onMouseDown() {
        moving = true;
    }

    function onMouseMove(e) {
        if (moving) {
            xcoord += e.movementX;
            ycoord += e.movementY;
            console.log(xcoord, ycoord);
        }
    }

    function onMouseUp() {
        moving = false;

        if (!howTo) return;

        HowTos.updateHowTo(
            new HowTo({
                ...howTo.getData(),
                xcoord: xcoord,
                ycoord: ycoord,
            }),
            true,
        );
    }

    function addRemoveReaction(reactionLabel: string) {
        if (!$user || !howTo) return;

        let newReactions;

        if (userHasBookmarked) {
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

        if (howTo.getBookmarkers().includes($user.uid)) {
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
        style="--xcoord: {xcoord}px; --ycoord: {ycoord}px;"
        onmousedown={onMouseDown}
    >
        <Dialog
            bind:show
            header={(l) => title}
            explanation={(l) => l.ui.howto.newHowTo.form.explanation}
            button={{
                tip: (l) => l.ui.howto.viewHowTo.view.tip,
                icon: title,
            }}
        >
            <div class="howtosplitview">
                <div>
                    <div class="toolbar">
                        {#if $user && howTo.isCreatorCollaborator($user.uid)}
                            <Button
                                tip={(l) => l.ui.howto.viewHowTo.edit.tip}
                                label={(l) => l.ui.howto.viewHowTo.edit.label}
                                active={true}
                                action={() => {}}
                            />
                            <Button
                                tip={(l) => l.ui.howto.viewHowTo.submit.tip}
                                label={(l) => l.ui.howto.viewHowTo.submit.label}
                                active={true}
                                action={() => {}}
                            />
                        {/if}
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
                    </div>
                    <Subheader text={(l) => l.ui.howto.newHowTo.prompt} />

                    <MarkupHTMLView markup={(l) => text} />
                </div>
                <div>
                    <Subheader
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
                    <Subheader text={(l) => l.ui.howto.viewHowTo.usedPrompt} />
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
                    <Subheader text={(l) => l.ui.howto.viewHowTo.chatPrompt} />
                </div>
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
        position: relative;
        left: var(--xcoord);
        top: var(--ycoord);
        width: fit-content;
        height: fit-content;
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
    }
    .howtosplitview {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        width: 50%;
    }
</style>
