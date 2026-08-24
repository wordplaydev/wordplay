<!-- @migration task: review uses of `navigating` -->
<script lang="ts">
    import { navigating } from '$app/state';
    import CreatorView from '@components/app/CreatorView.svelte';
    import Emoji from '@components/app/Emoji.svelte';
    import { UncomputablePreview } from '@components/app/previewTypes';
    import GlyphTile from '@components/app/GlyphTile.svelte';
    import Link from '@components/app/Link.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser, isAuthenticated } from '@components/project/Contexts';
    import Note from '@components/widgets/Note.svelte';
    import { Chats, Creators, DB, LoadedProjects, locales } from '@db/Database';
    import { getLocalizedProjectName } from '@db/projects/getLocalizedProjectName';
    import { isFlagged } from '@db/projects/Moderation';
    import { isAudience } from '@db/projects/ModerationUtils';
    import { enqueuePreviewCompute } from '@db/projects/previewQueue';
    import type Project from '@db/projects/Project';
    import type { SerializedPreview } from '@db/projects/ProjectSchemas';
    import Logo from '@components/app/Logo.svelte';
    import { REMIX_SYMBOL } from '@parser/Symbols';

    interface Props {
        project: Project;
        action?: (() => void) | undefined;
        /** Whether to show the project's name. */
        name?: boolean;
        /** How many rems the preview square should be. */
        size?: number;
        /** The link to go to when clicked. If none is provided, goes to the project. */
        link?: string | undefined;
        children?: import('svelte').Snippet;
        anonymize?: boolean;
        showCollaborators?: boolean;
        /** Show the project's owner even when the viewer can't edit it. The
         *  default gate hides attribution on someone else's project, which is
         *  exactly the case the share dialog's remix section needs to credit. */
        showOwner?: boolean;
        /** Search term for highlighting matches in project names */
        searchTerm?: string;
        /** Excerpt of matching source text to display when the match was not on the project name */
        matchText?: string;
        /** The folder this project is in, shown only where folders aren't drawn
         *  — a flattened search result, which would otherwise give no clue
         *  where the project actually lives. */
        folderName?: string;
        /** Whether this tile is what the projects page currently has chosen.
         *  Undefined everywhere else, which leaves the tile inert. */
        selected?: boolean;
        /** Choose this tile. Given only where choosing means something. */
        select?: () => void;
        /** Keys pressed while the tile has focus. */
        key?: (event: KeyboardEvent) => void;
        /** A press on the tile that might become a drag. */
        grab?: (event: PointerEvent) => void;
    }

    let {
        project,
        action = undefined,
        name = true,
        size = 6,
        link = undefined,
        children,
        anonymize = true,
        showCollaborators = false,
        showOwner = false,
        searchTerm = '',
        matchText = undefined,
        folderName = undefined,
        selected = undefined,
        select = undefined,
        key = undefined,
        grab = undefined,
    }: Props = $props();

    /** Whether this tile can be chosen and moved. */
    let interactive = $derived(select !== undefined);

    /** A click on a link or a button is that control's, not the tile's. Without
     *  this, opening a project would also choose it, and every button press
     *  would move the choice out from under whatever was chosen. */
    function isOwnClick(event: MouseEvent) {
        return !(
            event.target instanceof Element &&
            event.target.closest('a, button') !== null
        );
    }

    // Preview is a pure read of the persisted project metadata. On cache
    // miss the queue runs one compute at a time off the render path; we
    // hold the result in component state until (and only until) we navigate
    // away. Editable projects also get the result persisted so the next
    // visit hits the cached path.
    let displayed = $state<SerializedPreview | null>(null);

    $effect(() => {
        const cached = project.getPreview();
        if (cached) {
            displayed = cached;

            // Example projects ship a glyph-only auto preview (text with null
            // colors/face; see parseSerializedProject). Upgrade it in the
            // background so the tile shows the project's real Stage
            // background/color/font. Manual (pinned) previews and already-
            // computed previews (non-null foreground) are left untouched.
            const glyphOnly =
                cached.mode === 'auto' &&
                cached.characterName === null &&
                cached.foreground === null &&
                cached.background === null &&
                cached.face === null;
            if (glyphOnly) {
                let cancelled = false;
                enqueuePreviewCompute(project, $locales, DB)
                    .then((extracted) => {
                        if (cancelled) return;
                        // Overlay only the computed colors/face; keep the
                        // authored glyph and characterName from the .wp file.
                        displayed = {
                            ...cached,
                            foreground: extracted.foreground,
                            background: extracted.background,
                            face: extracted.face,
                        };
                    })
                    .catch(() => {
                        // Swallow — the authored glyph stays visible.
                    });
                return () => {
                    cancelled = true;
                };
            }
            return;
        }

        // Cache miss — show the placeholder square while a worker computes
        // the preview in the background.
        displayed = null;
        let cancelled = false;
        enqueuePreviewCompute(project, $locales, DB)
            .then((extracted) => {
                if (cancelled) return;
                const full: SerializedPreview = {
                    mode: 'auto',
                    ...extracted,
                };
                displayed = full;
                // Reading what's loaded rather than importing it: a tile is
                // only ever handed a Project once the database exists, and a
                // static import would put the runtime in every page that
                // lists projects.
                const projects = DB.MaybeProjects;
                if (projects?.isEditable(project))
                    projects.setAutoPreview(project.getID(), extracted);
            })
            .catch(() => {
                if (cancelled) return;
                // Show an em-dash rather than spinning forever. Errors from
                // the queue's evaluator aren't user-actionable, and we don't
                // persist this — it's a display fallback, not a real preview.
                displayed = { mode: 'auto', ...UncomputablePreview };
            });
        return () => {
            cancelled = true;
        };
    });

    const user = getUser();

    // ——— Descriptions ———————————————————————————————————————————————
    // A project's description comes from the parsed AST on the main source's
    // Program node. Documentation is Wordplay markup; show only the smallest
    // leading fragment (first sentence) as a short hint of the project's purpose.

    let description = $derived(
        project
            .getMain()
            .expression.docs.docs[0]?.markup.getFirstSentence($locales) ?? null,
    );

    let path = $derived(link ?? project.getLink(true));

    /** See if this is a public project being viewed by someone who isn't a creator or collaborator */
    let audience = $derived(isAudience($user, project));

    // Mirrors the adornment ProjectFooter puts after the name in the project
    // view, so a remix reads the same in a list as it does when open. Rendered
    // from the stored ID alone — resolving the source would cost a read per
    // tile, and a dead link lands on the project page's unknown-project notice.
    const remixOf = $derived(
        project.getRemixOf() === project.getID() ? null : project.getRemixOf(),
    );

    const owner = $derived(project.getOwner());
    const collaborators = $derived(project.getCollaborators());
    const editable = $derived($LoadedProjects?.isEditable(project) ?? false);

    // Read the chat from the global chats cache (kept current by the single
    // `participants array-contains` listener) rather than fetching it per tile.
    // Fetching here did a getDoc per preview — and again on every 4s rotation in
    // GalleryPreview — which under long-polling became a storm of transient chat
    // listen targets. The unread badge only matters for chats the user takes part
    // in, which the global listener already streams into this reactive cache.
    let projectID = $derived(project.getID());
    let chat = $derived(
        projectID !== null ? Chats.chats.get(projectID) : undefined,
    );

    let unread = $derived(
        chat !== undefined &&
            isAuthenticated($user) &&
            chat.hasUnread($user.uid),
    );
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- The tile is a plain container that can be chosen and dragged, not a
     control: it holds a link to the project, a link to its source, and a row
     of buttons, so giving it a button role would nest interactives inside an
     interactive. `aria-current` marks the choice instead — valid on any
     element, and the same idiom the language and palette lists use — and the
     keys that act on the choice are named in the list's instructions. -->
<div
    class="project"
    class:named={name}
    class:selected
    class:interactive
    data-project={project.getID()}
    aria-current={selected ? 'true' : undefined}
    tabindex={interactive ? 0 : undefined}
    onclick={(event) => (isOwnClick(event) ? select?.() : undefined)}
    onkeydown={key}
    onpointerdown={(event) =>
        event.target instanceof Element &&
        event.target.closest('a, button') === null
            ? grab?.(event)
            : undefined}
>
    <a
        class="preview"
        data-testid="preview"
        data-sveltekit-preload-data="tap"
        style:width={`${size}rem`}
        style:height={`${size}rem`}
        style:font-size={`${Math.max(4, size - 3)}rem`}
        href={action ? undefined : path}
        onclick={(event) =>
            action && event.button === 0 ? action() : undefined}
        onkeydown={(event) =>
            action && (event.key === '' || event.key === 'Enter')
                ? action()
                : undefined}
    >
        <GlyphTile
            preview={displayed}
            blurred={audience && isFlagged(project.getFlags())}
        />
    </a>
    {#snippet highlighted(text: string)}
        {#if searchTerm.trim()}
            {@const index = text
                .toLowerCase()
                .indexOf(searchTerm.toLowerCase())}
            {#if index !== -1}
                {text.slice(0, index)}<mark class="search-highlight"
                    >{text.slice(index, index + searchTerm.length)}</mark
                >{text.slice(index + searchTerm.length)}
            {:else}
                {text}
            {/if}
        {:else}
            {text}
        {/if}
    {/snippet}

    {#snippet remixAdornment()}
        {#if remixOf !== null}
            <Link
                to={`/project/${encodeURI(remixOf)}`}
                tip={(l) => l.ui.project.link.remixOf}
                ><Emoji text={REMIX_SYMBOL} /></Link
            >
        {/if}
    {/snippet}

    {#if name}
        {@const localizedName = getLocalizedProjectName(project, $locales)}
        <div class="name">
            {#if action}
                <div class="title">
                    {@render highlighted(
                        localizedName,
                    )}{@render remixAdornment()}
                </div>
            {:else}
                <div class="title">
                    <Link to={path}>
                        {#if localizedName.length === 0}<em class="untitled"
                                >&mdash;</em
                            >
                        {:else}
                            {@render highlighted(localizedName)}{/if}</Link
                    >{@render remixAdornment()}
                </div>
                {#if navigating && `${navigating.to?.url.pathname}${navigating.to?.url.search}` === path}
                    <Spinning />
                {:else}
                    <div class="controls-and-description">
                        <div class="controls">{@render children?.()}</div>
                        {#if description !== null}
                            <Note inline>
                                <MarkupHTMLView markup={description} inline />
                            </Note>
                        {/if}
                    </div>
                {/if}
            {/if}

            <!-- Show the owner when asked to attribute the project, or, on a
                 project the viewer can edit, alongside its collaborators. -->
            {#if owner !== null && (showOwner || (editable && showCollaborators && collaborators.length > 0))}
                <div class="creators">
                    {#await Creators.getCreator(owner)}
                        <Spinning />
                    {:then creator}
                        <CreatorView {anonymize} {creator} />
                    {/await}
                    {#if showCollaborators}
                        {#each collaborators.slice(0, 2) as collaborator}
                            {#await Creators.getCreator(collaborator)}
                                <Spinning />
                            {:then collaboratorCreator}
                                <CreatorView
                                    {anonymize}
                                    creator={collaboratorCreator}
                                />
                            {/await}
                        {/each}
                        {#if collaborators.length > 2}
                            <span>...</span>
                        {/if}
                    {/if}
                </div>
            {/if}
            {#if unread}
                <!-- The logo's shapes face: an unread chat is the bubble
                     with something to show. Still, not waving — the badge
                     already bounces. -->
                <div class="notification">
                    <Logo variant="shapes" pulse={false} />
                </div>
            {/if}
            {#if matchText}
                <div class="match-text">{@render highlighted(matchText)}</div>
            {/if}
            {#if folderName !== undefined}
                <Note inline>📁 {folderName}</Note>
            {/if}
        </div>
    {/if}
</div>

<style>
    .project {
        border-radius: var(--wordplay-border-radius);
        display: flex;
        flex-direction: row;
        align-items: flex-start;
        gap: var(--wordplay-spacing);
        /* Padding so the tile has a surface of its own to click and drag,
           rather than only the link and buttons it contains. */
        padding: var(--wordplay-spacing);
    }

    /* Grab, not pointer: the tile can be picked up and put in a folder. */
    .project.interactive {
        cursor: grab;
        border: var(--wordplay-focus-width) solid transparent;
    }

    .project.interactive:hover {
        background: var(--wordplay-hover-light);
    }

    /* Chosen is drawn exactly the same way on a folder: the light highlight
       fills the surface and a dashed border says it's the choice. Not the
       solid highlight color as a fill — that only clears 3:1, so it can't sit
       under the project's name. */
    .project.selected {
        background: var(--wordplay-hover-light);
        border-color: var(--wordplay-highlight-color);
        border-style: dashed;
    }

    .project.named {
        min-width: 12em;
    }

    a {
        text-decoration: none;
    }

    .name {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
    }

    /* Keeps the remix adornment on the same line as the name — .name itself is
       a column, so a bare sibling would drop to its own row. */
    .title {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: baseline;
        gap: var(--wordplay-spacing);
    }

    /* WCAG 2.5.8 wants 24px of target, or 24px of room around it. These links
       are flex items rather than words in a sentence, so the inline exception
       doesn't apply — and an untitled project's name is a single em dash. */
    .title :global(.link) {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 24px;
        min-width: 24px;
    }

    .untitled {
        color: var(--wordplay-inactive-color);
    }

    .preview {
        transition: transform ease-out;
        transition-duration: calc(var(--animation-factor) * 200ms);
        background: var(--wordplay-inactive-color);
    }

    .project .preview:hover,
    .project:focus .preview {
        transform: scale(1.05);
    }

    .preview {
        cursor: pointer;
        overflow: hidden;
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
        border-radius: var(--wordplay-border-radius);
        flex-shrink: 0;
        aspect-ratio: 1 / 1;
    }

    .preview:hover {
        border-color: var(--wordplay-highlight-color);
        border-width: var(--wordplay-focus-width);
    }

    .notification {
        display: inline-block;
        background: var(--wordplay-highlight-color);
        color: var(--wordplay-background);
        align-self: flex-start;
        border-radius: var(--wordplay-border-radius);
        /* Breathing room around the logo mark, which unlike the emoji it
           replaced has no line box of its own. */
        padding: 0.2em;
        line-height: 0;
        animation: bounce;
        animation-duration: calc(var(--animation-factor) * 1000ms);
        animation-delay: 0;
        animation-iteration-count: infinite;
    }

    .creators {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
        row-gap: var(--wordplay-spacing);
    }

    .match-text {
        font-size: var(--wordplay-small-font-size);
        color: var(--wordplay-inactive-color);
        font-style: italic;
        max-width: 20em;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .controls-and-description {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
    }

    .controls {
        display: flex;
        flex-direction: row;
        align-items: center;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
    }

    .search-highlight {
        background-color: var(--wordplay-highlight-color);
        color: var(--wordplay-foreground);
        padding: 0 var(--wordplay-spacing);
        border-radius: var(--wordplay-border-radius);
    }
</style>
