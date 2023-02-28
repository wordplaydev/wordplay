<div>|</div>

<style>
    div {
        font-family: 'Courier New', monospace;
        font-size: 72pt;
        height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    :global(.animated) div {
        animation: wobble infinite linear;
        animation-duration: 1s;
    }

    @keyframes wobble {
        0% {
            transform: rotate(0deg);
        }
        50% {
            transform: rotate(180deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }
</style>
