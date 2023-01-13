<script lang="ts">
    import {
        writingDirection,
        writingLayout,
    } from '../translation/translations';

    function toggleLayout() {
        writingLayout.set(
            $writingLayout === 'horizontal-tb'
                ? 'vertical-rl'
                : $writingLayout === 'vertical-rl'
                ? 'vertical-lr'
                : 'horizontal-tb'
        );
    }
    function toggleDirection() {
        writingDirection.set($writingDirection === 'ltr' ? 'rtl' : 'ltr');
    }
</script>

<div class="options">
    <div
        class="layout"
        style:writing-mode={$writingLayout}
        tabIndex="0"
        on:click={toggleLayout}
        on:keydown={(event) =>
            event.key === 'Enter' || event.key == ' '
                ? toggleLayout()
                : undefined}><div>1 2 3 4</div><div>5 6 7 8</div></div
    >
    <div
        class="direction"
        style:direction={$writingDirection}
        tabIndex="0"
        on:click={toggleDirection}
        on:keydown={(event) =>
            event.key === 'Enter' || event.key == ' '
                ? toggleDirection()
                : undefined}><div>1 2 3 4</div></div
    >
</div>

<style>
    .options {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
    }

    .layout,
    .direction {
        max-width: 5em;
        max-height: 5em;
        cursor: pointer;
        user-select: none;
    }

    .layout:focus {
        outline: var(--wordplay-highlight) solid var(--wordplay-focus-width);
    }
</style>
