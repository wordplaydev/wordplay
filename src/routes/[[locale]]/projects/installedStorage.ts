/**
 * Whether the projects page should explain that the installed app keeps its own
 * projects. On iOS an installed web app's storage is a container separate from
 * Safari's — cookies are copied across at install, but IndexedDB is not — so a
 * creator who worked signed out in the browser and then installed opens an
 * empty page and reasonably concludes their projects are gone (#564).
 *
 * Gated on having nothing to show, which makes it self-suppressing: creating a
 * project or signing in ends it, so there's no "seen" flag to persist, expire,
 * or reset. It also shows to someone installing before they've made anything,
 * which is why the message has to read as an explanation of how the installed
 * app stores work rather than as a recovery notice.
 */
export default function shouldExplainInstalledStorage({
    standalone,
    signedIn,
    hydrated,
    projectCount,
}: {
    standalone: boolean;
    signedIn: boolean;
    hydrated: boolean;
    projectCount: number;
}): boolean {
    return standalone && !signedIn && hydrated && projectCount === 0;
}
