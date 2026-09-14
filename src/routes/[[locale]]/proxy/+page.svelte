<!-- Exchanges a one-time token for a read-only session as another creator
     (#1313). Reached only by the new tab /admin opens; never linked. -->
<script lang="ts">
    import Notice from '@components/app/Notice.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import Writing from '@components/app/Writing.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Title from '@components/widgets/Title.svelte';
    import { ensureAppCheck, ensureAuth } from '@db/firebase';
    import { ProxyUntilKey } from '@db/proxySession';
    import { localeGoto } from '@util/localeGoto';
    import { onMount } from 'svelte';

    /** Nothing to show but progress, unless it fails. */
    let failure: 'expired' | 'failed' | undefined = $state(undefined);

    onMount(async () => {
        // The token arrives in the fragment rather than the query so it is
        // never sent to a server or written to a log, and it is taken out of
        // the address bar before anything can await — it is a bearer
        // credential for somebody else's account.
        const fragment = window.location.hash.replace(/^#/, '');
        const [token, until] = fragment.split(',');
        history.replaceState(null, '', window.location.pathname);

        if (!token) {
            failure = 'expired';
            return;
        }
        if (until) window.sessionStorage.setItem(ProxyUntilKey, until);

        try {
            // Attested before signing in, like every other path that writes to
            // Firebase Auth — see appCheckConvention.test.ts.
            await ensureAppCheck();
            const auth = await ensureAuth();
            if (auth === undefined) {
                failure = 'failed';
                return;
            }
            const { signInWithCustomToken } = await import('firebase/auth');
            await signInWithCustomToken(auth, token);
            // Their projects are what somebody debugging this came to see.
            localeGoto('/projects');
        } catch (error) {
            console.error(error);
            // A custom token is good for an hour and for one sign-in, so the
            // overwhelmingly likely failure is a reused or stale link.
            failure = 'expired';
        }
    });
</script>

<svelte:head>
    <Title text={(l) => l.ui.proxy.starting} />
</svelte:head>

<Writing>
    {#if failure === undefined}
        <Spinning />
        <p><LocalizedText path={(l) => l.ui.proxy.starting} /></p>
    {:else}
        <Notice>
            <MarkupHTMLView
                markup={failure === 'expired'
                    ? (l) => l.ui.proxy.expired
                    : (l) => l.ui.proxy.failed}
            />
        </Notice>
    {/if}
</Writing>
