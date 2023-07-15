<script lang="ts">
    import Button from '../widgets/Button.svelte';
    import LanguageChooser from './LanguageChooser.svelte';
    import { getUser, isDark } from '../project/Contexts';
    import { PUBLIC_CONTEXT } from '$env/static/public';
    import { creator } from '../../db/Creator';
    import LayoutChooser from './LayoutChooser.svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { clickOutside } from '../app/clickOutside';
    import Arrangement from '../../db/Arrangement';
    import Status from '../app/Status.svelte';

    let expanded = false;

    let user = getUser();
    let dark = isDark();

    $: arrangement = $creator.getArrangement();

    $: anonymous = $user === null;
    $: animationSymbol = { 0: '🧘🏽‍♀️', 1: '🏃‍♀️', 2: '½', 3: '⅓', 4: '¼' }[
        $creator.getAnimationFactor()
    ];

    function getBackPath(route: string): string {
        if (route.startsWith('/project/')) return '/projects';
        else return '/';
    }

    function handleKey(event: KeyboardEvent) {
        if (event.key === 'Escape' && $page.route.id !== null)
            goto(getBackPath($page.route.id));
    }
</script>

<svelte:window on:keydown={handleKey} />

<div
    class="settings"
    class:expanded
    use:clickOutside
    on:outclick={() => (expanded = false)}
>
    <div class="controls">
        {#if PUBLIC_CONTEXT !== 'prod'}
            <div class="account" class:anonymous>
                <a href="/login">
                    {$user
                        ? $user.email
                        : $creator.getLocale().ui.labels.anonymous}
                </a>
            </div>
        {/if}
        <Button
            tip={arrangement === Arrangement.free
                ? $creator.getLocale().ui.tooltip.vertical
                : arrangement === Arrangement.vertical
                ? $creator.getLocale().ui.tooltip.horizontal
                : $creator.getLocale().ui.tooltip.freeform}
            action={() =>
                $creator.setArrangement(
                    arrangement === Arrangement.vertical
                        ? Arrangement.horizontal
                        : arrangement === Arrangement.horizontal
                        ? Arrangement.free
                        : Arrangement.vertical
                )}
            >{#if arrangement === Arrangement.vertical}↕{:else if arrangement === Arrangement.horizontal}↔️{:else if arrangement === Arrangement.free}⏹️{/if}</Button
        >
        <Button
            tip={$creator.getLocale().ui.tooltip.animate}
            action={() =>
                $creator.setAnimationFactor(
                    $creator.getAnimationFactor() < 4
                        ? $creator.getAnimationFactor() + 1
                        : 0
                )}>{animationSymbol}</Button
        >
        <LayoutChooser />
        <LanguageChooser />
        <Button
            tip={$creator.getLocale().ui.tooltip.dark}
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
    <Status />
    <Button
        tip={$creator.getLocale().ui.tooltip.settings}
        action={() => (expanded = !expanded)}
        ><div class="gear" class:expanded>⚙</div></Button
    >
    {#if $page.route.id !== '/'}<Button
            tip={$creator.getLocale().ui.tooltip.back}
            enabled={$page.route.id !== null && $page.route.id !== "/'"}
            action={() => goto(getBackPath($page.route.id ?? '/'))}>❌</Button
        >{/if}
</div>

<style>
    .settings {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
        margin-left: auto;
    }

    .controls {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
        max-width: 0;
        max-height: 1.25em;
        opacity: 0;
        overflow-x: hidden;
        overflow-y: hidden;
        user-select: none;
    }

    .controls {
        transition: max-width, opacity;
        transition-duration: calc(var(--animation-factor) * 200ms);
        transition-timing-function: ease-out;
    }

    .settings.expanded .controls {
        max-width: 40em;
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
        font-size: medium;
    }

    .account.anonymous a {
        color: var(--wordplay-background);
    }
</style>
