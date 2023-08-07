<script lang="ts">
    import { config } from '../../db/Database';

    function toggleLayout() {
        $config.setWritingLayout(
            $config.getWritingLayout() === 'horizontal-tb'
                ? 'vertical-rl'
                : $config.getWritingLayout() === 'vertical-rl'
                ? 'vertical-lr'
                : 'horizontal-tb'
        );
    }
</script>

<div class="options">
    <div
        role="button"
        class="layout"
        style:writing-mode={$config.getWritingLayout()}
        tabindex="0"
        on:pointerdown|stopPropagation={toggleLayout}
        on:keydown={(event) =>
            event.key === 'Enter' || event.key == ' '
                ? toggleLayout()
                : undefined}><div>1 2 3</div><div>4 5 6</div></div
    >
</div>

<style>
    .options {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
        font-size: small;
    }

    .layout {
        font-size: 50%;
        max-width: 5em;
        max-height: 5em;
        cursor: pointer;
        user-select: none;
    }
</style>
