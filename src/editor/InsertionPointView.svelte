<span class="insertion-point"></span>

<style>
    .insertion-point {
        display: inline-block;
        vertical-align: middle;
        height: 2em;
        width: 0;
        outline: 2px solid var(--wordplay-highlight);
        animation-name: grow;
        animation-duration: 0.25s;
        animation-iteration-count: 1;
        z-index: 2;
    }

    @keyframes grow {
        0% {
            font-size: 0;
            height: 0;
        }

        100% {
            font-size: inherit;
            height: 2em;
        }
    }

    @keyframes grow-top {
        0% {
            margin-top: 0;
        }

        100% {
            margin-top: 1em;
        }
    }

</style>