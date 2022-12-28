<script lang="ts">

    export let split: number = 50;
    export let responsive: boolean = false;
    export let flip: boolean = false;
    export let min: number = 0;
    export let max: number = 100;

    let container: HTMLElement | undefined;
    let divider: HTMLElement | undefined;
    let dragging = false;

    function handleDividerMove(event: KeyboardEvent) {

        if(event.key === "ArrowRight" || event.key === "ArrowUp") {
            adjust(split + (!responsive || flip ? 1 : -1) * 5);
            event.preventDefault();
        }
        else if(event.key === "ArrowLeft" || event.key === "ArrowDown") {
            adjust(split + (!responsive || flip ? -1 : 1) * 5);
            event.preventDefault();
        }

    }

    function adjust(percent: number) { 
        if(divider === undefined) return;
        split = Math.min(max, Math.max(min, Math.round(percent)));    
    }

    function grab() { dragging = true; console.log("grab")}

    function release() { dragging = false; console.log("release") }

    function drag(event: MouseEvent) {
        const rect = container?.getBoundingClientRect();
        if(rect === undefined || divider === undefined || dragging === false || event.currentTarget !== container) return;
        const [ position, length ] = horizontal() ? [ event.clientX - rect.left, rect.width ] : [ event.clientY - rect.top, rect.height ];
        adjust(Math.min(max, Math.max(min, Math.round(100 * position / length))));
        event.preventDefault();
    }

    function horizontal() { return divider !== undefined && divider.clientWidth < 25; }

</script>

<section class="split" class:responsive class:flip
    style="--divider-split: {responsive && flip && horizontal() ? 100 - split : split}"
    on:mousemove={drag}
    on:mouseup|stopPropagation={release}
    bind:this={container}
>
    <div class="half first">
        <slot name="first"></slot>
    </div>
    <div class="divider"
        bind:this={divider}
        tabIndex=0
        on:mousedown|stopPropagation={grab}
        on:keydown={handleDividerMove}
        on:blur={release}
    />
    <div class="half last">
        <slot name="last"></slot>
    </div>
</section>

<style>

    .split {
        display: flex;
        height: 100%;
        width: 100%;
    }

    .divider {
        z-index: var(--wordplay-layer-controls);
        background-color: var(--wordplay-border-color);
    }

    .divider:focus {
        outline: var(--wordplay-highlight) solid var(--wordplay-focus-width);
        background-color: var(--wordplay-highlight);
    }

    @media screen {
        .split.responsive.flip  {
            flex-direction: row-reverse;
        }
        .first {
            border-left: var(--wordplay-border-width) solid var(--wordplay-border-color);
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
    }

    @media screen and (max-width: 1280px) {
        .split.responsive, .split.responsive.flip {
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
    }

    .last {
        flex: 1;
        flex-basis: 10em;
    }

    .half {
        display: flex;
        flex-direction: column;
        min-width: 2em;
        min-height: 2em;
    }    


</style>