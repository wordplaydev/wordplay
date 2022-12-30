<script lang="ts">
    export let split: number = 50;
    export let responsive: boolean = false;
    export let flip: boolean = false;
    export let min: number = 0;
    export let max: number = 100;
    export let hide: boolean = false;

    let container: HTMLElement | undefined;
    let divider: HTMLElement | undefined;
    let dragging = false;

    function handleDividerMove(event: KeyboardEvent) {
        if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
            adjust(split + (!responsive || flip ? 1 : -1) * 5);
            event.preventDefault();
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
            adjust(split + (!responsive || flip ? -1 : 1) * 5);
            event.preventDefault();
        }
    }

    function adjust(percent: number) {
        if (divider === undefined) return;
        split = Math.min(max, Math.max(min, Math.round(percent)));
    }

    function grab() {
        dragging = true;
    }

    function release(event: MouseEvent) {
        if (event.currentTarget === container) dragging = false;
    }

    function drag(event: MouseEvent) {
        const rect = container?.getBoundingClientRect();
        if (
            rect === undefined ||
            divider === undefined ||
            dragging === false ||
            event.currentTarget !== container
        )
            return;
        const [position, length] = horizontal()
            ? [event.clientX - rect.left, rect.width]
            : [event.clientY - rect.top, rect.height];
        adjust(
            Math.min(max, Math.max(min, Math.round((100 * position) / length)))
        );
        event.preventDefault();
    }

    function horizontal() {
        return divider !== undefined && divider.clientWidth < 25;
    }
</script>

<section
    class="split"
    class:responsive
    class:flip
    class:hide
    class:dragging
    style="--divider-split: {responsive && flip && horizontal()
        ? 100 - split
        : split}"
    on:mousemove={drag}
    on:mouseup={release}
    bind:this={container}
>
    <div class="half first">
        <slot name="first" />
    </div>
    <div
        class="divider"
        bind:this={divider}
        tabIndex="0"
        on:mousedown|stopPropagation={grab}
        on:keydown={handleDividerMove}
        on:blur={() => (dragging = false)}
    />
    <div class="half last">
        <slot name="last" />
    </div>
</section>

<style>
    .split {
        display: flex;
        height: 100%;
        width: 100%;
    }

    .divider:focus {
        outline: var(--wordplay-highlight) solid var(--wordplay-focus-width);
        background-color: var(--wordplay-highlight);
    }

    :not(.dragging) > .first {
        transition: flex-basis 0.1s ease-out;
    }

    .hide > .first {
        flex-basis: 0;
    }
    .hide > .divider {
        width: 0;
        display: none;
    }

    .split.dragging > .divider,
    .divider:focus {
        border: none;
    }

    @media screen {
        .split.responsive.flip {
            flex-direction: row-reverse;
        }
        .first {
            height: 100vh;
            flex-basis: calc(var(--divider-split) * 1vw);
        }

        .last {
            height: 100vh;
        }

        .divider {
            height: 100%;
            width: var(--wordplay-spacing);
            cursor: ew-resize;
        }

        .split.dragging {
            cursor: ew-resize;
        }

        .divider:not(:focus)::after {
            content: '';
            position: relative;
            display: block;
            left: var(--wordplay-border-width);
            top: 0;
            bottom: 0;
            width: var(--wordplay-border-width);
            height: 100%;
            background-color: var(--wordplay-border-color);
        }
    }

    @media screen and (max-width: 1280px) {
        .split.responsive,
        .split.responsive.flip {
            flex-direction: column;
        }

        .split.responsive .first {
            flex-basis: calc(var(--divider-split) * 1vh);
        }

        .split.responsive .divider {
            width: 100%;
            height: var(--wordplay-spacing);
            cursor: ns-resize;
        }

        .split.responsive.dragging {
            cursor: ns-resize;
        }

        .split.responsive .divider:not(:focus)::after {
            content: '';
            position: relative;
            display: block;
            top: calc(var(--wordplay-border-width));
            left: 0;
            right: 0;
            height: var(--wordplay-border-width);
            width: 100%;
            background-color: var(--wordplay-border-color);
        }
    }

    .last {
        flex: 1;
        flex-basis: 10em;
    }

    .half {
        display: flex;
        flex-direction: column;
        min-width: 0em;
        min-height: 0em;
    }
</style>
