<script lang="ts">
    import { preferredLocales } from '@locale/locales';
    import Button from '../widgets/Button.svelte';
    import { animationFactor } from '@models/stores';
    import LayoutChooser from './LayoutChooser.svelte';
    import LanguageChooser from './LanguageChooser.svelte';
    import { getUser, isDark } from '../project/Contexts';
    import { PUBLIC_CONTEXT } from '$env/static/public';

    let expanded = false;

    let user = getUser();
    let dark = isDark();

    $: anonymous = $user === null;
    $: animationSymbol = { 0: '🧘🏽‍♀️', 1: '🏃‍♀️', 2: '½', 3: '⅓', 4: '¼' }[
        $animationFactor
    ];
</script>

<div class="settings" class:expanded>
    {#if PUBLIC_CONTEXT !== 'prod'}
        <div class="account" class:anonymous>
            <a href="/login">
                {$user ? $user.email : $preferredLocales[0].ui.labels.anonymous}
            </a>
        </div>
    {/if}
    <div class="controls">
        <Button
            tip={$preferredLocales[0].ui.tooltip.animate}
            action={() =>
                animationFactor.set(
                    $animationFactor < 4 ? $animationFactor + 1 : 0
                )}>{animationSymbol}</Button
        >
        <LayoutChooser />
        <LanguageChooser />
        <Button
            tip={$preferredLocales[0].ui.tooltip.dark}
            action={() =>
                dark.set(
                    $dark === undefined
                        ? true
                        : $dark === true
                        ? false
                        : undefined
                )}
            ><div class="dark-mode"
                >{$dark === true ? '☽' : $dark === false ? '☼' : '☼/☽'}</div
            ></Button
        >
    </div>
    <Button
        tip={$preferredLocales[0].ui.tooltip.settings}
        action={() => (expanded = !expanded)}
        ><div class="gear" class:expanded>⚙</div></Button
    >
</div>

<style>
    .settings {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
    }

    .controls {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
        max-width: 0;
        opacity: 0;
        overflow-x: hidden;
        height: 2em;
        user-select: none;
    }

    .controls {
        transition: max-width, opacity;
        transition-duration: calc(var(--animation-factor) * 200ms);
        transition-timing-function: ease-out;
    }

    .settings.expanded .controls {
        max-width: 12em;
        opacity: 1;
        user-select: all;
    }

    .gear {
        transition: transform calc(var(--animation-factor) * 200ms) ease-out;
    }

    .dark-mode {
        display: inline-block;
        width: 2em;
    }

    .gear.expanded {
        display: inline-block;
        transform: rotate(270deg);
    }

    .account.anonymous {
        background: var(--wordplay-warning);
        color: var(--wordplay-background);
        padding: calc(var(--wordplay-spacing) / 2) var(--wordplay-spacing);
    }

    .account.anonymous a {
        color: var(--wordplay-background);
    }
</style>
