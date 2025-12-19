<script lang="ts">
    import Subheader from '@components/app/Subheader.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Dialog from '@components/widgets/Dialog.svelte';
    import { HowTos } from '@db/Database';
    import HowTo from '@db/howtos/HowToDatabase.svelte';

    interface Props {
        howTo: HowTo;
    }

    let { howTo }: Props = $props();
    let title: string = $derived(howTo.getTitle());
    let text: string[] = $derived(howTo.getText());
    let xcoord: number = $derived(howTo.getCoordinates()[0]);
    let ycoord: number = $derived(howTo.getCoordinates()[1]);
    let preview: string = $derived(text.at(0)?.charAt(0) || '');

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

        HowTos.updateHowTo(
            new HowTo({
                ...howTo.getData(),
                xcoord: xcoord,
                ycoord: ycoord,
            }),
            true,
        );
    }

    let show: boolean = $state(false);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="howto"
    style="--xcoord: {xcoord}px; --ycoord: {ycoord}px;"
    onmousedown={onMouseDown}
>
    <Dialog
        bind:show
        header={(l) => l.ui.howto.newHowTo.form.header}
        explanation={(l) => l.ui.howto.newHowTo.form.explanation}
        button={{
            tip: (l) => l.ui.howto.viewHowTo.view.tip,
            icon: title,
        }}
    >
        <Subheader text={(l) => l.ui.howto.newHowTo.prompt} />

        <MarkupHTMLView markup={(l) => text} />
    </Dialog>
    <div class="howtopreview">
        <p>{preview}</p>
    </div>
</div>

<svelte:window on:mouseup={onMouseUp} on:mousemove={onMouseMove} />

<style>
    .howto {
        overflow: hidden;
        position: relative;
        left: var(--xcoord);
        top: var(--ycoord);
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
