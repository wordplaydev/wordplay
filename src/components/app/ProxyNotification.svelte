<!-- Says, throughout a read-only session, whose Wordplay is being looked at
     (#1313), counts down what is left of it, and ends it when that runs out.

     Deliberately not dismissible, unlike the update notice: the one thing this
     session must never do is look like an ordinary one.

     The countdown is enforced here and nowhere else, and that boundary is worth
     stating. It stops a tab left open all afternoon from going on reading
     somebody's account, which is the case it exists for — carelessness, not
     attack. It is not a defence against the administrator themselves, who holds
     the token and could ask for another one; what protects the creator from
     them is that a proxy session cannot write, which `firestore.rules` enforces
     with no reference to the clock. -->
<script lang="ts">
    import Banner from '@components/app/Banner.svelte';
    import Button from '@components/widgets/Button.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser } from '@components/project/Contexts';
    import { Creators, locales } from '@db/Database';
    import { ensureAuth } from '@db/firebase';
    import {
        ProxyUntilKey,
        hasEnded,
        isProxySession,
        minutesLeft,
    } from '@db/proxySession';

    const user = getUser();

    /** The clock, ticked rather than read once — see the effect below. */
    let now = $state(Date.now());

    /** Who is being looked at. Resolved from the signed-in session rather than
     *  passed through the URL, so the name cannot disagree with the account the
     *  tab is actually in. A plain string, not a CreatorView: this is mounted by
     *  the root layout, whose import graph has the least room in the app. */
    let username = $state('');
    $effect(() => {
        const uid = $user?.uid;
        if (uid === undefined) return;
        Creators.getCreator(uid).then(
            (found) => (username = found?.getUsername(false) ?? ''),
        );
    });

    /**
     * When this session stops, from the claim minted with it.
     *
     * Depends on `$user` and on the clock deliberately. Session storage is not
     * reactive, and the root layout mounts this before the /proxy route has
     * stored anything — so a version that read it once found nothing and showed
     * no countdown at all for the whole first session, only appearing after a
     * reload. Naming the signed-in creator as a dependency re-reads it at the
     * moment sign-in completes, which is exactly when the value is there.
     */
    const until = $derived.by(() => {
        void $user;
        void now;
        if (typeof window === 'undefined') return undefined;
        const stored = window.sessionStorage.getItem(ProxyUntilKey);
        const parsed = stored === null ? NaN : Number.parseInt(stored, 10);
        return Number.isFinite(parsed) ? parsed : undefined;
    });

    /**
     * The clock, ticked rather than read once.
     *
     * `Date.now()` is not reactive, so the first version of this computed the
     * remaining minutes a single time at mount and then displayed that number
     * for the rest of the session — an hour in, it still said "60 minutes
     * left". Half a minute is fine for a figure shown in whole minutes, and it
     * costs one timer in the one tab that is a proxy session.
     */
    $effect(() => {
        if (!isProxySession() || until === undefined) return;
        const tick = setInterval(() => (now = Date.now()), 30_000);
        // And one more at the deadline itself. Half a minute is fine for a
        // figure shown in whole minutes, but it is not fine for *ending* — on
        // the interval alone the session ran on for up to thirty seconds past
        // its time, which makes the number on screen a rounding rather than a
        // promise.
        const deadline = setTimeout(
            () => (now = Date.now()),
            Math.max(0, until - Date.now()) + 100,
        );
        return () => {
            clearInterval(tick);
            clearTimeout(deadline);
        };
    });

    const over = $derived(until !== undefined && hasEnded(until, now));
    const minutes = $derived(
        until === undefined ? undefined : minutesLeft(until, now),
    );

    /**
     * End the session for real when the clock runs out.
     *
     * Signed out directly rather than through `Database.logout()`: that clears
     * every domain's local data, and while in a proxy tab it would only reach
     * the proxy tab's own database, it is not a habit worth having one naming
     * mistake away from the administrator's. Latched, because the effect
     * re-runs on every tick.
     */
    let ending = false;
    $effect(() => {
        if (!over || ending) return;
        ending = true;
        void ensureAuth().then((auth) => auth?.signOut());
    });
</script>

{#if isProxySession() && over}
    <!-- Blocks the page rather than sitting above it: the session is gone, and
         what is left underneath is a signed-out app that would only confuse. -->
    <div class="ended" role="alert">
        <div class="ended-message">
            <MarkupHTMLView markup={(l) => l.ui.proxy.ended} />
            <Button
                tip={(l) => l.ui.proxy.stop.tip}
                label={(l) => l.ui.proxy.stop.label}
                action={() => window.close()}
                background
            />
        </div>
    </div>
{:else if isProxySession() && $user}
    <Banner message={(l) => l.ui.proxy.banner} variant="notice" kind="banner">
        {#snippet actions()}
            <span class="who"
                >{$locales
                    .concretize((l) => l.ui.proxy.as, { name: username })
                    ?.toText() ??
                    username}{#if minutes !== undefined}&nbsp;·&nbsp;{$locales
                        .concretize((l) => l.ui.proxy.remaining, { minutes })
                        ?.toText() ?? ''}{/if}</span
            >
            <Button
                tip={(l) => l.ui.proxy.stop.tip}
                label={(l) => l.ui.proxy.stop.label}
                action={() => window.close()}
                background
            />
        {/snippet}
    </Banner>
{/if}

<style>
    .who {
        font-size: var(--wordplay-small-font-size);
        /* A username is somebody's data, and worth copying. */
        user-select: text;
        -webkit-user-select: text;
    }

    .ended {
        position: fixed;
        inset: 0;
        z-index: 100;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--wordplay-spacing);
        background: var(--wordplay-background);
    }

    .ended-message {
        display: flex;
        flex-direction: column;
        align-items: start;
        gap: var(--wordplay-spacing);
        max-width: 30em;
    }
</style>
