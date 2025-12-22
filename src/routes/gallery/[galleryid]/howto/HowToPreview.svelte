<script lang="ts">
    import { HowTos } from '@db/Database';
    import HowTo from '@db/howtos/HowToDatabase.svelte';
    import HowToForm from './HowToForm.svelte';

    interface Props {
        howTo: HowTo;
        cameraX: number;
        cameraY: number;
        childMoving: boolean;
        draftsArea?: DOMRect | undefined;
        requestedId?: string | null;
    }

    let {
        howTo = $bindable(),
        cameraX,
        cameraY,
        childMoving = $bindable(),
        draftsArea = undefined,
        requestedId = null,
    }: Props = $props();

    let title: string = $derived(howTo?.getTitle() ?? '');
    let text: string[] = $derived(howTo?.getText() ?? []);
    let preview: string = $derived(text.at(0)?.charAt(0) || '');
    let howToId: string = $derived(howTo?.getHowToId() ?? '');
    let xcoord: number = $derived(howTo?.getCoordinates()[0] ?? 0);
    let ycoord: number = $derived(howTo?.getCoordinates()[1] ?? 0);
    let isPublished: boolean = $derived(howTo ? howTo.isPublished() : false);

    childMoving = false;
    let thisChildMoving = false;
    let thisChildMoved = false;

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

    function onKeyPress(event: KeyboardEvent) {
        if (thisChildMoving) {
            switch (event.key) {
                case 'ArrowUp':
                    ycoord -= 10;

                    thisChildMoved = true;
                    event.preventDefault();
                    break;
                case 'ArrowDown':
                    ycoord += 10;

                    thisChildMoved = true;
                    event.preventDefault();
                    break;
                case 'ArrowLeft':
                    xcoord -= 10;

                    thisChildMoved = true;
                    event.preventDefault();
                    break;
                case 'ArrowRight':
                    xcoord += 10;

                    thisChildMoved = true;
                    event.preventDefault();
                    break;
                default:
                    return;
            }
        }
    }

    function onDropHowTo(clientX: number, clientY: number) {
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
                    xcoord = clientX - cameraX;
                    ycoord = clientY - cameraY;
                }
            }

            howTo = new HowTo({
                ...howTo.getData(),
                xcoord: xcoord,
                ycoord: ycoord,
                published: published,
            });

            HowTos.updateHowTo(howTo, true);
        }
    }

    function onMouseUp(event: MouseEvent) {
        onDropHowTo(event.clientX, event.clientY);
    }

    function onLoseFocus(event: FocusEvent) {
        if (thisChildMoved) {
            thisChildMoved = false;
            let item = document
                .getElementById(`howto-${howToId}`)
                ?.getBoundingClientRect();

            onDropHowTo(item?.left ?? 0, item?.top ?? 0);
        } else {
            thisChildMoving = false;
            childMoving = false;
        }
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
    class="howto"
    style="--renderedX: {renderX}px; --renderedY: {renderY}px; --positioning: {isPublished
        ? 'absolute'
        : 'relative'};"
    onmousedown={onMouseDown}
    id="howto-{howToId}"
    tabindex="0"
    aria-label="How-to preview for {title}"
    onfocus={onMouseDown}
    onblur={onLoseFocus}
    onkeydown={onKeyPress}
>
    <HowToForm editingMode={false} bind:howTo />
    <div class="howtopreview">{preview}</div>
</div>
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
        flex: 0 0 auto;
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
</style>
