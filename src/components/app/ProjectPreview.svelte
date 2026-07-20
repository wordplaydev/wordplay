<!-- @migration task: review uses of `navigating` -->
<script lang="ts">
    import { navigating } from '$app/state';
    import CreatorView from '@components/app/CreatorView.svelte';
    import GlyphTile from '@components/app/GlyphTile.svelte';
    import Link from '@components/app/Link.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser, isAuthenticated } from '@components/project/Contexts';
    import Note from '@components/widgets/Note.svelte';
    import { Chats, Creators, DB, locales, Projects } from '@db/Database';
    import { getLocalizedProjectName } from '@db/projects/getLocalizedProjectName';
    import { isFlagged } from '@db/projects/Moderation';
    import { isAudience } from '@db/projects/ModerationUtils';
    import { enqueuePreviewCompute } from '@db/projects/previewQueue';
    import type Project from '@db/projects/Project';
    import type { SerializedPreview } from '@db/projects/ProjectSchemas';
    import { PHRASE_SYMBOL } from '@parser/Symbols';

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
        /** Search term for highlighting matches in project names */
        searchTerm?: string;
        /** Excerpt of matching source text to display when the match was not on the project name */
        matchText?: string;
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
        searchTerm = '',
        matchText = undefined,
    }: Props = $props();

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
                if (Projects.isEditable(project))
                    Projects.setAutoPreview(project.getID(), extracted);
            })
            .catch(() => {
                // Swallow — the placeholder square stays visible. Errors
                // from the queue's evaluator are not user-actionable here.
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

    const owner = $derived(project.getOwner());
    const collaborators = $derived(project.getCollaborators());
    const editable = $derived(Projects.isEditable(project));

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

<div class="project" class:named={name}>
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

    {#if name}
        {@const localizedName = getLocalizedProjectName(project, $locales)}
        <div class="name">
            {#if action}
                {@render highlighted(localizedName)}
            {:else}
                <Link to={path}>
                    {#if localizedName.length === 0}<em class="untitled"
                            >&mdash;</em
                        >
                    {:else}
                        {@render highlighted(localizedName)}{/if}</Link
                >
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

            <!-- If editable and there's an owner, possibly show collaborators. -->
            {#if editable && owner !== null && showCollaborators && collaborators.length > 0}
                <div class="creators">
                    {#await Creators.getCreator(owner)}
                        <Spinning />
                    {:then creator}
                        <CreatorView {anonymize} {creator} />
                    {/await}
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
                </div>
            {/if}
            {#if unread}
                <div class="notification">{PHRASE_SYMBOL}</div>
            {/if}
            {#if matchText}
                <div class="match-text">{@render highlighted(matchText)}</div>
            {/if}
        </div>
    {/if}
</div>

<style>
    .project {
        border: var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        display: flex;
        flex-direction: row;
        align-items: flex-start;
        gap: var(--wordplay-spacing);
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
