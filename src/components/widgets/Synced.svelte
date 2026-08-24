<!-- The cloud that marks a setting as following the creator's account instead of
     staying on the device it was set on. Signed out there is no account to
     follow, so it reads as inactive and says what signing in would do. -->
<script lang="ts">
    import Emoji from '@components/app/Emoji.svelte';
    import {
        getTip,
        getUser,
        isAuthenticated,
    } from '@components/project/Contexts';
    import {
        canFocusTips,
        canHoverTips,
    } from '@components/widgets/tipTriggers';
    import { locales } from '@db/Database';
    import type LocaleText from '@locale/LocaleText';
    import { withMonoEmoji } from '@unicode/emoji';

    let hint = getTip();
    let user = getUser();

    let badge: HTMLSpanElement | undefined = undefined;

    let signedIn = $derived(isAuthenticated($user));
    let path = $derived(
        signedIn
            ? (l: LocaleText) => l.ui.widget.synced.saved
            : (l: LocaleText) => l.ui.widget.synced.signedOut,
    );

    function showTip() {
        if (badge)
            hint.showMultilingual($locales.getMultilingualEntries(path), badge);
    }
    function hideTip() {
        hint.hide();
    }
</script>

<!-- role="img" rather than the interactive roles: this is a static mark on the
     row, and giving it a tab stop would add one per synced setting. A screen
     reader meets it reading the row, and the label carries the same sentence the
     tooltip does. -->
<span
    class="synced"
    class:inactive={!signedIn}
    role="img"
    bind:this={badge}
    aria-label={$locales.getPrimaryPlainText(path)}
    onfocus={(event) =>
        canFocusTips(event.currentTarget) ? showTip() : undefined}
    onblur={hideTip}
    onpointerenter={() => (canHoverTips() ? showTip() : undefined)}
    onpointerleave={hideTip}><Emoji text={withMonoEmoji('☁️')} /></span
>

<style>
    .synced {
        font-size: var(--wordplay-small-font-size);
        cursor: help;
    }

    /* Signed out, the sync is available rather than happening. Uses the
       palette's AA text grey, since this is text. */
    .inactive {
        color: var(--wordplay-inactive-color);
    }
</style>
