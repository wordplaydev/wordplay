<div class="cursor">|</div>

<style>
    .cursor {
        display: inline-block;
        animation: spin infinite linear;
        animation-duration: calc(var(--animation-factor) * 1s);
    }

    @keyframes spin {
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
