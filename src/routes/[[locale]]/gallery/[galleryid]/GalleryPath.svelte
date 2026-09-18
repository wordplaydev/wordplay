<script lang="ts">
    import Notice from '@components/app/Notice.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { toClipboard } from '@components/editor/commands/Clipboard';
    import Button from '@components/widgets/Button.svelte';
    import ConfirmButton from '@components/widgets/ConfirmButton.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import { disconnected, Galleries } from '@db/Database';
    import type Gallery from '@db/galleries/Gallery';
    import {
        isValidGalleryPath,
        repairGalleryPath,
    } from '@db/galleries/galleryPath';
    import {
        claimGalleryPath,
        galleryPathAvailable,
        releaseGalleryPath,
    } from '@db/galleries/galleryPaths';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import {
        CANCEL_SYMBOL,
        CONFIRM_SYMBOL,
        COPY_SYMBOL,
    } from '@parser/Symbols';
    import { localeGoto } from '@util/localeGoto';

    /**
     * Choosing the short name in a gallery's link (#180).
     *
     * Lives in the Visibility tab rather than a tab of its own: a gallery may
     * only have a name while it is public and approved, so the moderation
     * notice right below is what explains why the field is or isn't here.
     */
    interface Props {
        gallery: Gallery;
    }

    let { gallery }: Props = $props();

    /**
     * The gallery as the database holds it now, falling back to the page's own
     * copy.
     *
     * The page resolves its `gallery` once per navigation, and both callables
     * write `path` and `pathAliases` on the *server* — so nothing about this
     * component's own prop changes when one lands. Claiming got away with it by
     * navigating to the new name; giving up an older name stays on the same URL,
     * and would have left this list saying what it said before the write. The
     * database's maps are reactive, so reading through them re-renders when the
     * listener catches up.
     */
    const showing = $derived(Galleries.getKnown(gallery.getID()) ?? gallery);

    const current = $derived(showing.getPath());
    const aliases = $derived(showing.getPathAliases());
    /** Every name this gallery answers to, the one in its link first. One list
     *  rather than two, because giving any of them up is the same act. */
    const names = $derived(
        (current === null ? aliases : [current, ...aliases]).map((name) => ({
            name,
            current: name === current,
        })),
    );

    let wanted = $state('');
    let submitting = $state(false);
    let checking = $state(false);
    let available: boolean | undefined = $state(undefined);
    let feedback: LocaleTextAccessor | undefined = $state(undefined);
    let copied = $state(false);

    /** Reset the field whenever we're shown a different gallery, so a name
     *  typed for one is never offered for another. */
    $effect(() => {
        gallery.getID();
        wanted = '';
        available = undefined;
        feedback = undefined;
    });

    /** The nearest name that would work, offered when what they typed won't.
     *  Worth more here than for a username: a gallery's real name is usually a
     *  phrase, and "Ms Kim's 4th Period" has no valid spelling until the spaces
     *  and the apostrophe become separators. */
    const suggestion = $derived.by(() => {
        if (wanted === '' || isValidGalleryPath(wanted)) return undefined;
        const repaired = repairGalleryPath(wanted);
        return repaired !== wanted && isValidGalleryPath(repaired)
            ? repaired
            : undefined;
    });

    const ready = $derived(
        isValidGalleryPath(wanted) &&
            available !== false &&
            wanted !== current &&
            !submitting &&
            !$disconnected,
    );

    /** What a curator would actually paste, which is the whole point of the
     *  feature — a link nobody can see isn't one they can share. */
    const link = $derived(
        typeof window === 'undefined'
            ? showing.getLink()
            : `${window.location.origin}${showing.getLink()}`,
    );

    function report(result: string, releasing = false) {
        feedback =
            result === 'claimed'
                ? (l) => l.ui.gallery.path.claimed
                : result === 'released'
                  ? (l) => l.ui.gallery.path.released
                  : // The same word means two different things: asking for a
                    // name somebody else holds, and giving up a name that
                    // turned out not to be ours.
                    result === 'taken'
                    ? releasing
                        ? (l) => l.ui.gallery.path.error.notYours
                        : (l) => l.ui.gallery.path.error.taken
                    : result === 'invalid'
                      ? (l) => l.ui.gallery.path.error.invalid
                      : result === 'not-listed'
                        ? (l) => l.ui.gallery.path.error.unlisted
                        : (l) => l.ui.gallery.path.error.failure;
    }

    async function save() {
        if (!ready) return;
        submitting = true;
        feedback = undefined;
        const claimed = wanted;
        try {
            const result = await claimGalleryPath(gallery.getID(), wanted);
            report(result);
            if (result === 'taken') available = false;
            if (result === 'claimed') {
                wanted = '';
                // The document we hold was written by the callable, not by us,
                // so re-read it rather than guessing what it now says.
                await Galleries.find(gallery.getID());
                // Stand on the name that was just chosen. Copying the link out
                // of the address bar is most of what this feature is for, and a
                // curator naming a gallery is standing on its id URL at exactly
                // the moment they are about to do that.
                await goToSegment(claimed);
            }
        } finally {
            submitting = false;
        }
    }

    /** Move to this gallery's address under a segment, replacing rather than
     *  pushing: renaming is not a place in history to go back to, and the name
     *  left behind no longer resolves. */
    async function goToSegment(segment: string) {
        await localeGoto(`/gallery/${encodeURIComponent(segment)}`, {
            replaceState: true,
        });
    }

    /** Give up one of this gallery's names, current or old. Every name in the
     *  list goes the same way, which is what lets it be one list. */
    async function release(name: string) {
        submitting = true;
        feedback = undefined;
        const wasCurrent = name === current;
        try {
            const result = await releaseGalleryPath(gallery.getID(), name);
            report(result, true);
            if (result === 'released') {
                await Galleries.find(gallery.getID());
                // Only when the name being given up is the one in the address
                // bar: it stopped resolving the moment it went, so staying on it
                // would hand the curator a page that 404s on reload.
                if (wasCurrent) await goToSegment(gallery.getID());
            }
        } finally {
            submitting = false;
        }
    }
</script>

<Subheader text={(l) => l.ui.gallery.path.subheader.header} />
<MarkupHTMLView markup={(l) => l.ui.gallery.path.subheader.explanation}
></MarkupHTMLView>

<p class="link">
    <code>{link}</code>
    <Button
        tip={copied
            ? (l) => l.ui.gallery.path.copied
            : (l) => l.ui.gallery.path.copy.tip}
        action={async () => {
            copied = (await toClipboard(link)) === true;
        }}>{COPY_SYMBOL}</Button
    >
</p>

<form onsubmit={save}>
    <TextField
        id="gallery-path-field"
        description={(l) => l.ui.gallery.field.path.description}
        placeholder={(l) => l.ui.gallery.field.path.placeholder}
        bind:text={wanted}
        editable={!submitting}
        validator={(text) =>
            text === '' || isValidGalleryPath(text)
                ? available === false
                    ? (l) => l.ui.gallery.path.error.taken
                    : true
                : (l) => l.ui.gallery.path.error.invalid}
        changed={() => {
            if (available === false) available = undefined;
        }}
        dwelled={async (text) => {
            if (!isValidGalleryPath(text)) return;
            checking = true;
            // Only a definite "no" marks it taken; undefined means we couldn't
            // ask, and telling a curator their own free name is taken is the
            // worse of the two failures.
            available =
                (await galleryPathAvailable(gallery.getID(), text)) !== false;
            checking = false;
        }}
    />
    <Spinning size={1} spin={checking}></Spinning>
    <Button
        submit
        background
        tip={(l) => l.ui.gallery.path.save.tip}
        label={(l) => l.ui.gallery.path.save.label}
        active={ready}
        action={save}
    />
</form>

{#if suggestion}
    <p>
        <Button
            tip={() => suggestion}
            action={() => {
                wanted = suggestion;
                available = undefined;
            }}>{suggestion}</Button
        >
    </p>
{/if}

{#if names.length > 0}
    <!-- Every name that reaches this gallery, so a curator can see which
         handed-out links still work and give up the ones they no longer want.
         The one in the link now is marked rather than kept in its own row: it
         and the older names differ in status, not in what can be done to them. -->
    <div class="path-names">
        <LocalizedText path={(l) => l.ui.gallery.path.names} />
        {#each names as { name, current: inUse } (name)}
            <span class="path-name" class:inuse={inUse}>
                {#if inUse}<span class="check" aria-hidden="true"
                        >{CONFIRM_SYMBOL}</span
                    >{/if}
                <code>{name}</code>
                {#if inUse}<span class="status"
                        ><LocalizedText
                            path={(l) => l.ui.gallery.path.currentName}
                        /></span
                    >{/if}
                <ConfirmButton
                    background={false}
                    tip={(l) => l.ui.gallery.path.release.description}
                    prompt={(l) => l.ui.gallery.path.release.prompt}
                    enabled={!submitting && !$disconnected}
                    action={() => release(name)}
                    icon={CANCEL_SYMBOL}
                ></ConfirmButton>
            </span>
        {/each}
    </div>
{/if}

{#if submitting}
    <Spinning />
{:else if feedback}
    <Notice inline text={feedback} />
{/if}

<style>
    .link,
    form,
    .path-names {
        display: flex;
        align-items: center;
        gap: var(--wordplay-spacing);
        flex-wrap: wrap;
    }

    /* Stated rather than inherited from the inline flow the form used to rely
       on: a block child in there took a line of its own, so anything below the
       field sat against it with no gap and changed rows when it changed
       display. Everything vertical here is the tab panel's own column gap. */
    form {
        margin: 0;
    }

    .path-name {
        display: flex;
        align-items: center;
        gap: var(--wordplay-spacing-half);
        border: var(--wordplay-border-width) solid transparent;
        border-radius: var(--wordplay-border-radius);
    }

    /* The name in the link right now. A ✓ and a word accompany the border so
       the distinction never rides on color alone. */
    .path-name.inuse {
        border-color: var(--wordplay-highlight-color);
        padding-inline: var(--wordplay-spacing-half);
    }

    .status {
        font-style: italic;
        color: var(--wordplay-inactive-color);
        font-size: var(--wordplay-small-font-size);
    }

    /* The names are what someone types into an address bar, so they read as
       code, and the box is what makes a run of them separable without a
       punctuation mark no translation could rely on. */
    .path-names code {
        font-family: var(--wordplay-code-font);
        background: var(--wordplay-alternating-color);
        border-radius: var(--wordplay-border-radius);
        padding: 0 var(--wordplay-spacing-half);
    }
</style>
