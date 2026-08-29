<script lang="ts">
    // Side-effect import: registers type-mismatch resolvers with the Conflict
    // registry. Loaded once at app startup so the registry is populated by
    // the time any annotation asks for resolutions. See the file's header
    // for why it can't be imported by the conflict files directly.

    // Notifications state lives in @db so the databases that write it don't
    // import from this route component (that cycle crashes WebKit hydration).

    import { browser } from '$app/environment';
    import { page } from '$app/state';
    import {
        clearUnclaimedDialog,
        mountedDialogIds,
        PARAM_DIALOG,
    } from '@components/widgets/dialogURL';
    import Loading from '@components/app/Loading.svelte';
    import UpdateNotification from '@components/app/UpdateNotification.svelte';
    import Banner from '@components/app/Banner.svelte';
    import Announcer from '@components/project/Announcer.svelte';
    import Hint, { ActiveHint } from '@components/widgets/Hint.svelte';
    import { firestore } from '@db/firebase';
    import { FaceSetting } from '@db/settings/FaceSetting';
    import { type LocaleTextsAccessor } from '@locale/Locales';
    import { getManifestPath } from '@locale/SupportedLocales';
    import {
        SupportedLocales,
        type SupportedLocale,
    } from '@locale/SupportedLocales';
    import type { User } from 'firebase/auth';
    import { onMount, type Snippet } from 'svelte';
    import { writable, type Writable } from 'svelte/store';
    import Fonts from '@basis/faces/Fonts';
    import { appFontFamilies, codeFontFamilies } from '@basis/faces/fontChains';
    import {
        setAnnouncer,
        setLocalizing,
        setTip,
        setUser,
        type AnnouncerContext,
    } from '@components/project/Contexts';
    import {
        animationFactor,
        appBanner,
        authAttempted,
        dark,
        DB,
        howToNotifications,
        HowTos,
        locales,
        localesReady,
        Settings,
    } from '@db/Database';
    import shouldPromptForLocale, {
        hasBeenAsked,
        loadLocalePrompt,
        markAsked,
    } from '@components/settings/localePrompt';
    import { getLanguageDirection } from '@locale/LanguageCode';

    interface Props {
        children: Snippet;
    }

    let { children }: Props = $props();

    let loaded = $state(false);
    let lag = $state(false);
    let localizing = $state<{
        on: boolean;
        focused: LocaleTextsAccessor | undefined;
    }>({ on: false, focused: undefined });

    /** Create a user store to share globally. Undefined means we don't know if the user is logged in yet. Null means not logged in. */
    const user = writable<User | null | undefined>(undefined);
    setUser(user);

    // Create a store context for the announcer function.
    let announcerStore: Writable<AnnouncerContext> = writable();
    setAnnouncer(announcerStore);

    setLocalizing(localizing);

    /** Keep the page's language and direction up to date. */
    $effect(() => {
        if (typeof document !== 'undefined') {
            const language = $locales.getLocale().language;
            document.documentElement.setAttribute('lang', language);
            document.documentElement.setAttribute(
                'dir',
                getLanguageDirection(language),
            );
            // And the manifest, so an install names the app in the language on
            // screen. hooks.server.ts sets this per prerendered page, but an
            // unprefixed route (`/projects`) has no locale to render from and
            // gets en-US; browsers read the manifest from the live DOM at
            // install time, so updating the link here is enough.
            const manifest = document.querySelector('link[rel="manifest"]');
            if (manifest !== null)
                manifest.setAttribute(
                    'href',
                    getManifestPath($locales.getLocaleString()),
                );
        }
    });

    /** Remove the locale-loading class added by locale-preload.js once the preferred locale is ready. */
    $effect(() => {
        if (browser && $localesReady)
            document.documentElement.classList.remove('locale-loading');
    });

    onMount(() => {
        // Force default font to load
        Fonts.loadFace('Noto Sans');

        // Reveal once the app's TEXT faces (Noto Sans regular + bold, Latin
        // slice) are ready, rather than waiting on document.fonts.ready — which
        // also blocks on the 471KB block-display Noto Emoji face and so delays
        // first paint. Emoji still loads (block + preloaded) and pops in a beat
        // later; decoupling lets text and the project appear sooner, with no
        // tofu. A timeout is a safety valve so a slow/failed font can't strand
        // the overlay (mirrors the guard in scripts/locale-preload.js).
        const textReady = Promise.all([
            document.fonts.load('400 1em "Noto Sans"', 'Aa'),
            document.fonts.load('700 1em "Noto Sans"', 'Aa'),
        ]).catch(() => undefined);
        const revealTimeout = new Promise((resolve) =>
            setTimeout(resolve, 3000),
        );
        void Promise.race([textReady, revealTimeout]).then(
            () => (loaded = true),
        );

        // Listen for logged in users. On sign-in, (re-)request persistent
        // storage — Chrome grants it based on engagement, so asking once a
        // real user is present succeeds more often than at first paint.
        DB.login((newUser) => {
            user.set(newUser);
            if (newUser) void DB.requestPersistentStorage();
        });

        // Ask the browser to keep our IndexedDB cache from being silently
        // evicted under disk pressure, and warn once if storage is near full.
        void DB.requestPersistentStorage();
        void DB.checkStorageHeadroom();

        // Install browser online/offline + visibilitychange listeners.
        const cleanupNetworkListeners = DB.installNetworkListeners();

        // Read the local project cache once the page is up rather than on
        // import: hydration deserializes every cached project and each one
        // builds a Basis, which is seconds of main-thread work on a phone and
        // used to happen before first paint on every page. Only devices with
        // project work to do pay for it at all — a first-time visitor reading
        // the landing page never does. Pending edits aren't at risk while we
        // wait; they live in a durable dirty table and replay when this runs.
        const startProjects = () =>
            void DB.shouldStartProjectWork().then((should) => {
                if (should) void DB.startProjectWork();
            });
        const idleSupported = typeof window.requestIdleCallback === 'function';
        const idle = idleSupported
            ? window.requestIdleCallback(startProjects)
            : window.setTimeout(startProjects, 200);

        // Warn before closing/reloading the tab when there are edits not yet
        // saved online (e.g. made offline). The save-on-unload handlers above
        // flush to the LOCAL cache, but local-only edits would still be lost on
        // a different device or if this device's cache is cleared, so prompt.
        const warnUnsaved = (event: BeforeUnloadEvent) => {
            if (DB.getUnsavedCount() > 0) {
                event.preventDefault();
                // Legacy browsers need returnValue set to trigger the prompt.
                event.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', warnUnsaved);

        // Wait a second before showing loading
        setTimeout(() => (lag = true), 1000);

        // Have the Database cleanup database connections when this is unmounted.
        return () => {
            if (idleSupported) window.cancelIdleCallback(idle);
            else window.clearTimeout(idle);
            cleanupNetworkListeners();
            window.removeEventListener('beforeunload', warnUnsaved);
            DB.clean();
        };
    });

    /** When the dark setting changes, drive the html element's color-scheme,
        which both light-dark() and native form controls track. 'light dark'
        means follow the OS; a single keyword forces that mode. */
    $effect(() => {
        if (browser) {
            document.documentElement.style.colorScheme =
                $dark === true
                    ? 'dark'
                    : $dark === false
                      ? 'light'
                      : 'light dark';
        }
    });

    function computeAppFace() {
        return appFontFamilies(
            // The override UI font from settings, if selected
            Settings.getFace(),
            // All of the fonts preferred by the locales
            $locales.getLocales().map((locale) => locale.ui.font.app),
        );
    }

    let appFaces = $state(computeAppFace());

    let codeFonts = $derived(
        codeFontFamilies(
            $locales.getLocales().map((locale) => locale.ui.font.code),
        ),
    );

    // When the face store changes, update the app faces and load the font, if not loaded.
    // Eventually need to migrate this to $state runes for deep reactivity, to avoid the mess above.
    onMount(() => {
        const unsub = FaceSetting.value.subscribe((value) => {
            appFaces = computeAppFace();
            if (value) Fonts.loadFace(value);
        });
        return () => unsub();
    });

    let hint = $state(new ActiveHint());

    /** Create a global state for a tip to show at the top level */
    setTip(hint);

    // Start or stop listening for how-tos as the setting changes. It used to
    // also clear the whole bell, which meant turning off *how-to* notifications
    // silently threw away moderation warnings and gallery decisions too. The
    // setting now only decides whether how-tos are derived into the bell at
    // all, which is what its label says it does.
    $effect(() => {
        if (!$howToNotifications) {
            HowTos.ignore();
        } else if ($user && firestore) {
            HowTos.listen(firestore, $user.uid);
        }
    });

    // When the URL locale param changes, sync it into the Database so all
    // components see the correct locale(s) without requiring a page reload.
    // The param may contain multiple locales joined by '+' (e.g. "en-US+es-MX").
    $effect(() => {
        const urlLocale = page.params.locale as string | undefined;
        if (browser && urlLocale) {
            const valid = urlLocale
                .split('+')
                .filter((l) =>
                    SupportedLocales.includes(l as SupportedLocale),
                ) as SupportedLocale[];
            if (valid.length > 0) {
                DB.Locales.setLocales(valid);
                // Arriving by a URL that names a language is a choice too, and it has to
                // be recorded separately: setLocales skips the write when the value is
                // unchanged, so picking the default (en-US) would otherwise store nothing
                // and leave the prompt asking forever.
                markAsked();
            }
        }
    });

    /** Whether the language prompt is open. Backed by state rather than derived because
     *  Dialog binds it, and because it must be latched: see `decided` below. */
    let promptingLocale = $state(false);

    /** Offer the language chooser to a visitor who has never picked one (#1256).
     *
     *  Decided exactly once per page. A re-running effect would reopen the dialog every
     *  time it was dismissed, since `page.url` changes on every navigation and `$user`
     *  is re-set on each hourly token refresh — so `decided` is a plain `let`, whose
     *  assignment doesn't itself retrigger this. */
    let decided = false;
    $effect(() => {
        if (decided) return;
        if (
            !browser ||
            !shouldPromptForLocale({
                urlLocale: page.params.locale,
                routeId: page.route.id,
                localesPersisted: Settings.settings.locales.isPersisted(),
                asked: hasBeenAsked(),
                authAttempted: $authAttempted,
                user: $user,
                // Nothing focused yet. Browsers disagree on what "nothing" is before
                // the first focus — body in Chromium, sometimes the root element —
                // so treat both as untouched rather than never prompting.
                interacting:
                    document.activeElement !== null &&
                    document.activeElement !== document.body &&
                    document.activeElement !== document.documentElement,
            })
        )
            return;
        decided = true;
        promptingLocale = true;
    });

    /** Once the prompt closes — by a choice, Escape, the ✕, or a click outside — don't
     *  ask again on this device. Without this a stray backdrop click would mean being
     *  interrupted on every future visit, since declining stores nothing by itself. */
    $effect(() => {
        // `showing` is read before anything can short-circuit past it: `decided` is a
        // plain `let`, so `decided && !promptingLocale` would skip the read entirely on
        // the first run and leave this effect subscribed to nothing at all.
        const showing = promptingLocale;
        if (decided && !showing) markAsked();
    });

    /** Close the prompt if authentication resolves to a signed-in creator while it's
     *  open. Auth normally reports a restored session in one go, but a slow restore can
     *  report signed-out first, and their account already carries preferred locales. */
    $effect(() => {
        if (promptingLocale && $user) promptingLocale = false;
    });

    // Strip a `dialog` query param that no mounted dialog claims, so a shared or
    // stale link can't leave a dirty URL. Reading `page.url` and the reactive
    // `mountedDialogIds` set makes this re-run as the URL changes and as dialogs
    // mount — important because dialogs deep in the tree (e.g. the project
    // view's footer) mount only after the project loads, well after navigation
    // settles. So we don't strip immediately: a short grace timer gives a
    // late-mounting dialog time to claim the param, and the moment one does this
    // effect re-runs and clears the timer. Only a param still unclaimed after
    // the grace period (a genuinely stale link) gets stripped.
    $effect(() => {
        if (!browser) return;
        const current = page.url.searchParams.get(PARAM_DIALOG);
        if (current === null || mountedDialogIds.has(current)) return;
        const timer = setTimeout(() => clearUnclaimedDialog(), 5000);
        return () => clearTimeout(timer);
    });
</script>

<!-- The root touchstart only dismisses the app-wide hint tooltip on any
     touch; it is purely dismissive and needs no keyboard analogue (the hint
     dismisses on blur/Escape through its own widget). -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="root"
    class:dark={$dark}
    style:--animation-factor={$animationFactor}
    style:--wordplay-app-font={appFaces}
    style:--wordplay-code-font={codeFonts}
    lang={$locales.getLocale().language}
    ontouchstart={() => hint.hide()}
>
    <!-- App-wide transient banner for one-off action failures (e.g. a delete
         that couldn't reach the cloud). In normal flow at the top so the page
         content shrinks to fit; auto-dismisses via Database.reportBanner. -->
    {#if $appBanner !== undefined}
        <Banner
            message={$appBanner}
            variant="error"
            dismiss={() => appBanner.set(undefined)}
        />
    {/if}
    <!-- Top banner when a newer app version has been deployed. In the top flow
         alongside the failure banner, using the same standard Banner facility. -->
    <UpdateNotification />
    <div class="content">
        <!-- Always render children, even before the user's preferred locale
             finishes loading. The server renders with the default locale,
             and so must the client during hydration — otherwise gating on
             $localesReady would skip the page's <svelte:head> on the client
             for non-en-US users while the server already emitted a <title>,
             producing a hydration mismatch (see Title.svelte for the matching
             locale-pinning during initial render).

             While fonts/locale are still loading (and after a brief lag), the
             Loading overlay covers the content area so the partially-rendered,
             font-jiggling page underneath isn't visible. It's absolutely
             positioned within .content (position: relative below), so it sits
             on top of the children rather than pushing them down. The separate
             non-en-US first-paint case is handled by the `locale-loading` CSS
             class (see app.html), removed once $localesReady flips. -->
        {#if (!$localesReady || !loaded) && lag}
            <Loading />
        {/if}
        {@render children()}
    </div>
</div>
<!-- Render a live region with announcements as soon as possible -->
<Announcer
    bind:announcer={() => $announcerStore, (fn) => announcerStore.set(fn)}
/>
<Hint></Hint>
<!-- Loaded and mounted only once we've decided to ask. Dialog renders its children
     whether or not it's open, so a static import would build the chooser's several
     hundred language and region options into every route — and into the prerendered
     HTML of every static page — for a dialog most visitors never see. -->
{#if promptingLocale}
    {#await loadLocalePrompt() then LocalePrompt}
        <LocalePrompt bind:show={promptingLocale} />
    {:catch}<!-- The chunk didn't arrive. Say nothing rather than letting the
        rejection tear down the layout; the language footer still works. -->{/await}
{/if}

<style>
    /* Flex column filling the pinned html/body (see app.html) so the banner can
       take its natural space at the top and the content shrinks to fit — same
       pattern Page.svelte uses for the Localizer header. `overflow: hidden` keeps
       anything that escapes an inner pane from extending the document; sizing in
       percent rather than `dvh` means an iOS URL-bar transition can't relayout the
       app mid-scroll. */
    .root {
        display: flex;
        flex-direction: column;
        height: 100%;
        max-height: 100%;
        overflow: hidden;
        font-family: var(--wordplay-app-font);
        font-weight: var(--wordplay-font-weight);
        font-size: var(--wordplay-font-size);
        color: var(--wordplay-foreground);
    }

    .content {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        /* Containing block for the Loading overlay so it covers this area. */
        position: relative;
    }
</style>
