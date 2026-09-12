<script lang="ts">
    import Notice from '@components/app/Notice.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import KitModerationNotice from '@components/moderation/KitModerationNotice.svelte';
    import ResponsibilityNotice from '@components/moderation/ResponsibilityNotice.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Public from '@components/project/Public.svelte';
    import ConfirmButton from '@components/widgets/ConfirmButton.svelte';
    import Link from '@components/app/Link.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Note from '@components/widgets/Note.svelte';
    import Options from '@components/widgets/Options.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import { kitURL } from '@concepts/ConceptParams';
    import { DB, locales } from '@db/Database';
    import type { SerializedKit, SerializedKitVersion } from '@db/kits/Kit';
    import type KitDatabase from '@db/kits/KitDatabase.svelte';
    import {
        kitDescription,
        kitPreviewSource,
        pickKitPreviewExample,
    } from '@db/kits/kitPreview';
    import { isWithdrawable } from '@db/kits/Kit';
    import kitKinds from '@db/kits/kitKinds';
    import { checkKit, exportName } from '@db/kits/validateKit';
    import { kitExports } from '@nodes/publishedShare';
    import { kitVisibility } from '@db/moderation/visibility';
    import { nextModeration } from '@db/moderation/nextModeration';
    import Project from '@db/projects/Project';
    import { Projects } from '@db/projects/Projects';
    import { enqueuePreviewCompute } from '@db/projects/previewQueue';
    import { firstSentenceOf } from '@locale/firstSentence';
    import { docsFor } from '@nodes/publishedShare';
    import type Source from '@nodes/Source';
    import toValidName from '@util/toValidName';

    interface Props {
        project: Project;
        editable: boolean;
    }

    let { project, editable }: Props = $props();

    /**
     * The kit database, loaded on demand.
     *
     * Never imported statically: `Database` is reachable from every page, and a page that
     * merely lists projects has no reason to be able to fetch anyone's code. See
     * `importGraph.test.ts`.
     */
    let kits = $state<KitDatabase | undefined>(undefined);
    $effect(() => {
        DB.loadKits().then((loaded) => (kits = loaded));
    });

    /** Only a source with something shared can become a kit. */
    const publishable = $derived(
        project
            .getSources()
            .map((source, index) => ({ source, index }))
            .filter(({ source }) => kitExports(source).length > 0),
    );

    /** Whether this project has already published a kit, which decides whether the panel
     *  has anything to show. A creator who removes the last ↑ from a published source
     *  still has a kit, with versions and a standing with the moderators — hiding all of
     *  that behind "nothing is shared yet" leaves them nowhere to answer a decision. */
    const publishedKit = $derived(project.getKitID() !== null);

    /**
     * Which source this project publishes, by its index among *all* sources — the index
     * the project records, so the conflicts in the editor and the dialog agree about
     * which source is the kit.
     */
    let chosen = $state<number | undefined>(undefined);
    const sourceIndex = $derived(
        chosen ??
            (publishable.some(
                ({ index }) => index === project.getKitSourceIndex(),
            )
                ? project.getKitSourceIndex()
                : (publishable[0]?.index ?? project.getKitSourceIndex())),
    );
    const source = $derived<Source | undefined>(
        project.getSources()[sourceIndex],
    );

    /** What the chooser offers: everything that shares something, plus the source this
     *  kit already publishes even when its last ↑ was just removed — a chooser whose
     *  value is none of its options renders with nothing selected. */
    const choices = $derived(
        publishable.some(({ index }) => index === sourceIndex) ||
            source === undefined
            ? publishable
            : [...publishable, { source, index: sourceIndex }],
    );

    const exports = $derived(source === undefined ? [] : kitExports(source));

    const readiness = $derived(
        source === undefined
            ? { empty: true, conflicts: [] }
            : checkKit(source),
    );

    const username = $derived(DB.getUsername());

    /** The kit this project publishes, found by the id it recorded — never by name, so a
     *  rename can't make the next publish create a second kit. */
    const published = $derived<SerializedKit | undefined>(
        kits === undefined
            ? undefined
            : (kits.byID.get(project.getKitID() ?? '') ?? undefined),
    );

    /** The bare name. Fixed once published: a kit's name is what other people's `↓` lines
     *  say, and renaming it would break them with nothing to alias it to. */
    let typedName = $state<string | undefined>(undefined);
    const bareName = $derived(
        published !== undefined
            ? published.name.slice(published.name.indexOf('/') + 1)
            : (typedName ?? toValidName(project.getName())),
    );
    const fullName = $derived(
        published?.name ??
            (username === undefined ? undefined : `${username}/${bareName}`),
    );

    /** A kit's description is the first sentence of its source's own doc: one place to
     *  write it, already the thing the guide renders, and it cannot drift from the code. */
    const description = $derived(
        source === undefined ? '' : kitDescription(source, $locales),
    );

    let versions = $state<SerializedKitVersion[]>([]);
    $effect(() => {
        const id = published?.id;
        if (kits === undefined || id === undefined) versions = [];
        else kits.getVersions(id).then((found) => (versions = found));
    });

    /** A kit's name has to be one a borrow can actually write after `@username/`. */
    const nameInvalid = $derived(
        bareName.length === 0 || toValidName(bareName) !== bareName,
    );

    const ready = $derived(
        editable &&
            source !== undefined &&
            !readiness.empty &&
            readiness.conflicts.length === 0 &&
            !nameInvalid &&
            username !== undefined,
    );

    /** Whether the newest version can still be taken back. See `isWithdrawable`: only
     *  while nobody could have found the kit to borrow it. */
    const withdrawable = $derived(
        published !== undefined && isWithdrawable(published),
    );

    let withdrawing = $state(false);

    async function withdraw() {
        if (kits === undefined || published === undefined) return;
        withdrawing = true;
        try {
            await kits.withdraw(published.id);
            versions = await kits.getVersions(published.id);
        } finally {
            withdrawing = false;
        }
    }

    let publishing = $state(false);
    /** Set when a publish didn't reach the server. Cleared on the next attempt, so a
     *  retry that works doesn't leave the failure on screen. */
    let failed = $state(false);

    async function publish() {
        if (
            kits === undefined ||
            source === undefined ||
            fullName === undefined
        )
            return;
        publishing = true;
        failed = false;
        try {
            // Rendered once, here, so browsing the registry evaluates nothing. The example
            // is evaluated in the kit's own scope — see kitPreviewSource.
            const example = pickKitPreviewExample(source);
            const preview =
                example === undefined
                    ? undefined
                    : await enqueuePreviewCompute(
                          Project.make(
                              null,
                              'kit-preview',
                              kitPreviewSource(source, example),
                              [],
                              $locales.getLocales(),
                          ),
                          $locales,
                          DB,
                      ).catch(() => undefined);

            const result = await kits.publish(
                project.getKitID(),
                fullName,
                description,
                {
                    sourceName: source.names.toWordplay(),
                    code: source.getCode().toString(),
                    locales: project.getLocaleCodes(),
                },
                kitExports(source).map((e) => exportName(e)),
                kitKinds(source, project.getContext(source)),
                project.getID(),
                preview,
            );

            // Record which kit this project is, and which source it publishes — which is
            // also what turns the editor's publishing annotations on from here.
            if (result !== undefined)
                Projects.reviseProject(
                    project.withKitID(result.kit.id).withKitSource(sourceIndex),
                );
            // A publish that didn't land has to say so. It returns `undefined` for a
            // refused or dropped write, and saying nothing is what made a version that
            // reached no server read as one waiting for a moderator.
            else failed = true;
        } finally {
            publishing = false;
        }
    }
</script>

<MarkupHTMLView markup={(l) => l.ui.dialog.share.subheader.kit.explanation} />

{#if publishable.length === 0 && !publishedKit}
    <!-- Most creators meet ↑ here, since nothing in the shipped examples uses it. So
         this says what to do rather than only that something is missing. -->
    <MarkupHTMLView markup={(l) => l.ui.dialog.share.kit.nothing} />
{:else}
    <Subheader text={(l) => l.ui.dialog.share.kit.heading.name} />

    {#if choices.length > 1}
        <Options
            id="kitsource"
            label={(l) => l.ui.dialog.share.options.source}
            value={`${sourceIndex}`}
            options={choices.map(({ source: choice, index }) => ({
                value: `${index}`,
                label: choice.getPreferredName($locales.getLocales()),
            }))}
            change={(value) => (chosen = Number(value ?? 0))}
        />
    {/if}

    <p class="name">
        <span class="owner">{username ?? '…'}/</span>
        {#if published !== undefined}
            <!-- Fixed once published: other people's `↓` lines say this name. -->
            <code>{bareName}</code>
        {:else}
            <TextField
                id="kitname"
                text={bareName}
                placeholder={(l) => l.ui.dialog.share.kit.name.placeholder}
                description={(l) => l.ui.dialog.share.kit.name.description}
                changed={(text) => (typedName = text)}
                {editable}
            />
        {/if}
    </p>

    <MarkupHTMLView markup={(l) => l.ui.dialog.share.kit.derived} />
    {#if description.length > 0}
        <p class="description">{description}</p>
    {:else}
        <Note
            ><LocalizedText
                path={(l) => l.ui.dialog.share.kit.undescribed}
            /></Note
        >
    {/if}

    <Subheader text={(l) => l.ui.dialog.share.kit.heading.exports} />

    <!-- What the registry and the kit's page will show, so there is no surprise between
         pressing publish and reading the result. Boxed, so the list reads as one object
         rather than running into the section below it — but only when there is something
         in it, since an empty box reads as a broken control rather than as nothing. -->
    {#if exports.length > 0}
        <div class="box">
            <ul class="exports">
                {#each exports as exported}
                    {@const docs =
                        source === undefined
                            ? undefined
                            : docsFor(exported, source)}
                    <li>
                        <code>{exportName(exported)}</code>
                        {#if docs && !docs.isEmpty()}
                            <!-- The first sentence of what the kit's page will show in
                                 full, which is what a preview should be: the same words,
                                 less of them. A bare list of names says only that
                                 something exists. -->
                            <MarkupHTMLView
                                markup={firstSentenceOf(
                                    docs.getPreferredLocale($locales).markup,
                                    $locales.getLocaleString(),
                                )}
                            />
                        {/if}
                    </li>
                {/each}
            </ul>
        </div>
    {/if}

    <!-- Every reason this can't be published yet, in the words the editor uses for the
         same problem — one set of strings, so a checklist and an annotation can't drift.
         Everything here except "nothing is shared" is also a conflict on the code it's
         about, which is where it can actually be fixed. Outside the box above, because a
         problem with the kit's *name* rendered inside the list of what it shares reads as
         a problem with the last export. -->
    {#if readiness.empty || readiness.conflicts.length > 0 || nameInvalid}
        <Notice text={(l) => l.ui.dialog.share.kit.unpublishable} />
        <ul class="reasons">
            {#if nameInvalid}
                <li
                    ><LocalizedText
                        path={(l) => l.ui.dialog.share.kit.problem.invalid}
                    /></li
                >
            {/if}
            {#if readiness.empty}
                <li
                    ><LocalizedText
                        path={(l) => l.ui.dialog.share.kit.problem.exports}
                    /></li
                >
            {/if}
            {#each readiness.conflicts as conflict}
                {@const context =
                    source === undefined
                        ? undefined
                        : project.getContext(source)}
                {#if context}
                    <li>
                        <MarkupHTMLView
                            markup={conflict
                                .getMessage(context, [])
                                .explanation($locales, context)}
                        />
                    </li>
                {/if}
            {/each}
        </ul>
    {/if}

    <!-- With the list it acts on, rather than between that list and the versions below,
         where it read as a heading for them. A confirmation rather than a plain button,
         because publishing cannot be taken back and nothing else said so. -->
    <!-- Above the control that produced it, so the answer to "did that work?" is where
         the creator is already looking. -->
    {#if failed}
        <Notice text={(l) => l.ui.dialog.share.kit.failed} />
    {/if}
    {#if publishing}
        <Spinning label={(l) => l.ui.dialog.share.kit.publish.label} />
    {:else}
        <ConfirmButton
            tip={(l) => l.ui.dialog.share.kit.publish.tip}
            label={(l) => l.ui.dialog.share.kit.publish.label}
            prompt={(l) => l.ui.dialog.share.kit.confirm}
            enabled={ready && kits !== undefined}
            action={publish}
            testid="publish-kit"
        />
        <!-- Below the button and in note style: it is commentary on the action, not a
             condition blocking it. -->
        <Note
            ><MarkupHTMLView
                markup={(l) => l.ui.dialog.share.kit.permanent}
                inline
            /></Note
        >
    {/if}

    <Subheader text={(l) => l.ui.dialog.share.kit.heading.versions} />
    {#if versions.length === 0}
        <MarkupHTMLView markup={(l) => l.ui.dialog.share.kit.unpublished} />
    {:else}
        <div class="box">
            <ul class="versions">
                {#each versions as version}
                    <li>
                        <Link to={kitURL(version.name, version.version)}
                            >{$locales
                                .concretize(
                                    (l) => l.ui.dialog.share.kit.version,
                                    {
                                        version: `${version.version}`,
                                    },
                                )
                                .toText()}</Link
                        >
                        <!-- Only the newest, and only while the kit has never been
                             listed — see `isWithdrawable`. Withdrawing does not free the
                             number: the next publish takes the one after it. -->
                        {#if withdrawable && version.version === published?.latest}
                            <ConfirmButton
                                tip={(l) => l.ui.dialog.share.kit.withdraw.tip}
                                label={(l) =>
                                    l.ui.dialog.share.kit.withdraw.label}
                                prompt={(l) =>
                                    l.ui.dialog.share.kit.withdraw.label}
                                enabled={editable && !withdrawing}
                                action={withdraw}
                                testid="withdraw-kit"
                            />
                        {/if}
                    </li>
                {/each}
            </ul>
            {#if withdrawable}
                <MarkupHTMLView
                    markup={(l) => l.ui.dialog.share.kit.withdrawable}
                />
            {:else}
                <MarkupHTMLView
                    markup={(l) => l.ui.dialog.share.kit.permanent}
                />
            {/if}
        </div>
    {/if}

    {#if published !== undefined}
        <Subheader text={(l) => l.ui.dialog.share.kit.heading.listing} />
        <!-- Above the control, the placement `GalleryModerationNotice` argues for: a
             creator who is waiting, or who was turned down, should find that out when
             they look, not after a failed attempt.

             The state shown is the one the kit is *about to* have. The client never writes
             `moderation` — `setPublic` writes only `public` and leaves the rest to the
             `kitEdited` trigger — so reading the stored value here would say nothing at
             the one moment a creator most wants an answer: just after asking. Derived with
             the server's own rule so the two cannot drift. -->
        <KitModerationNotice
            kit={published}
            moderation={nextModeration(
                published.moderation,
                published.public,
                false,
            )}
        />
        <!-- Who reviews this, where the kit stands with them, and the control itself —
             but not the rules, which the Public tab of this same dialog already states,
             in words that name a project rather than a kit. -->
        <Public
            isPublic={published.public}
            flags={published.flags}
            visibility={kitVisibility(published)}
            checkStanding
            header={false}
            rules={false}
            modes={(l) => l.ui.dialog.share.kit.listing}
            set={(choice) => kits?.setPublic(published.id, choice === 1)}
        >
            {#snippet responsibility()}
                <!-- Said here rather than through `ResponsibilityNotice`, whose
                     "only visible to you and the people you choose" is wrong twice for
                     a kit: there is nobody to choose, and an unlisted kit's versions
                     stay readable to anyone holding the borrow line. -->
                {#if !published.public}
                    <MarkupHTMLView
                        markup={(l) => l.ui.dialog.share.kit.unreviewed}
                    />
                {:else}
                    <ResponsibilityNotice
                        visibility={kitVisibility(published)}
                    />
                {/if}
            {/snippet}
            {#snippet remedy()}
                <!-- How to answer a decision, said where the decision is said. Nowhere
                     else tells a creator that editing is the reply. -->
                <MarkupHTMLView markup={(l) => l.ui.dialog.share.kit.remedy} />
            {/snippet}
        </Public>
        <!-- Said in this panel's own words, because it is not what "public" means
             anywhere else in the app: withdrawing a kit stops it being *found*, and every
             project that already borrows it keeps working. A creator will otherwise
             assume unpublishing breaks people. -->
        <Note
            ><MarkupHTMLView
                markup={(l) => l.ui.dialog.share.kit.discovery}
                inline
            /></Note
        >
    {/if}
{/if}

<style>
    .name {
        display: flex;
        align-items: baseline;
        gap: var(--wordplay-spacing);
    }

    .owner {
        color: var(--wordplay-inactive-color);
    }

    .description {
        color: var(--wordplay-inactive-color);
    }

    /* One group of the panel, so a list reads as an object with edges rather than as
       loose text running into whatever follows it. */
    .box {
        border: solid var(--wordplay-border-width) var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        padding: var(--wordplay-spacing);
    }

    .exports,
    .versions {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
    }

    /* The withdraw control sits beside the version it acts on, not under it. */
    .versions li {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: baseline;
        gap: var(--wordplay-spacing);
    }

    /* Unstyled, like the flag list in `Public.svelte` a section below: the `Notice`
       above says these are problems, and colouring the text as well says it twice in a
       way nothing else in the app does. */
    .reasons {
        margin: 0;
    }
</style>
