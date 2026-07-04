<script lang="ts">
    // Side-effect import: registers type-mismatch resolvers with the Conflict
    // registry. Loaded once at app startup so the registry is populated by
    // the time any annotation asks for resolutions. See the file's header
    // for why it can't be imported by the conflict files directly.
    import '@conflicts/registerTypeResolutions';

    // Notifications state lives in @db so the databases that write it don't
    // import from this route component (that cycle crashes WebKit hydration).
    import { notifications } from '@db/notifications.svelte';

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
    import {
        SupportedLocales,
        type SupportedLocale,
    } from '@locale/SupportedLocales';
    import type { User } from 'firebase/auth';
    import { onMount, type Snippet } from 'svelte';
    import { writable, type Writable } from 'svelte/store';
    import Fonts from '@basis/faces/Fonts';
    import {
        appFontFamilies,
        codeFontFamilies,
    } from '@basis/faces/fontChains';
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
        dark,
        DB,
        howToNotifications,
        HowTos,
        locales,
        localesReady,
        Settings,
    } from '@db/Database';
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

        // Show only after fonts are loaded, to prevent font jiggle.
        document.fonts.ready.then(() => (loaded = true));

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

        // Install best-effort save-on-unload handlers so local edits
        // (especially in-memory CRDT state) survive a tab close that
        // beats saveSoon's debounce. See
        // ProjectsDatabase.installSaveOnUnloadListeners for what it
        // catches and what it can't.
        const cleanupSaveOnUnload = DB.Projects.installSaveOnUnloadListeners();

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
            cleanupNetworkListeners();
            cleanupSaveOnUnload();
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

    // if the user turns off how-to notifications, clear existing notifications
    // if notifications are on, listen for changing from the how-to database
    $effect(() => {
        if (!$howToNotifications) {
            notifications.clear();
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
            if (valid.length > 0) DB.Locales.setLocales(valid);
        }
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

<style>
    /* Flex column at the viewport height so the banner can take its natural
       space at the top and the content shrinks to fit — same pattern Page.svelte
       uses for the Localizer header. Keeps the page itself non-scrolling. */
    .root {
        display: flex;
        flex-direction: column;
        height: 100dvh;
        max-height: 100dvh;
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
