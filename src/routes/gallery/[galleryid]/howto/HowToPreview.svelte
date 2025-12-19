<script lang="ts">
    import Subheader from '@components/app/Subheader.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Dialog from '@components/widgets/Dialog.svelte';

    interface Props {
        xcoord: number;
        ycoord: number;
        title: string;
        preview: string;
    }

    let { xcoord = 0, ycoord = 0, title = '', preview = '' }: Props = $props();

    let moving: boolean = false;

    // Drag and drop function referenced from: https://svelte.dev/playground/7d674cc78a3a44beb2c5a9381c7eb1a9?version=5.46.0
    function onMouseDown() {
        moving = true;
    }

    function onMouseMove(e) {
        if (moving) {
            xcoord += e.movementX;
            ycoord += e.movementY;
        }
    }

    function onMouseUp() {
        moving = false;
    }

    let show: boolean = $state(false);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="howto"
    style="--xcoord: {xcoord}px; --ycoord: {ycoord}px;"
    onmousedown={onMouseDown}
>
    <p>{title}</p>
    <div class="howtopreview">
        <Dialog
            bind:show
            header={(l) => l.ui.howto.newHowTo.form.header}
            explanation={(l) => l.ui.howto.newHowTo.form.explanation}
            button={{
                tip: (l) => l.ui.howto.newHowTo.add.tip,
                icon: preview,
                large: true,
            }}
        >
            <Subheader text={(l) => l.ui.howto.newHowTo.prompt} />

            <MarkupHTMLView markup={(l) => 'hello world'} />
        </Dialog>
    </div>
</div>

<svelte:window on:mouseup={onMouseUp} on:mousemove={onMouseMove} />

<style>
    .howto {
        overflow: hidden;
        position: absolute;
        left: var(--xcoord);
        top: var(--ycoord);
        min-width: 100px;
        max-width: 100px;
    }

    .howtopreview {
        min-width: 100px;
        min-height: 100px;
        max-width: 100px;
        max-height: 100px;
        border: 1px solid var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        padding: var(--wordplay-spacing);
    }
</style>
