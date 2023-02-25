<script lang="ts">
    import { writingDirection, writingLayout } from '@translation/translations';

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
        on:click|stopPropagation={toggleLayout}
        on:keydown={(event) =>
            event.key === 'Enter' || event.key == ' '
                ? toggleLayout()
                : undefined}><div>1 2 3</div><div>4 5 6</div></div
    >
    <div
        class="direction"
        style:direction={$writingDirection}
        tabIndex="0"
        on:click|stopPropagation={toggleDirection}
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
        font-size: 50%;
    }

    .layout,
    .direction {
        max-width: 5em;
        max-height: 5em;
        cursor: pointer;
        user-select: none;
    }
</style>
