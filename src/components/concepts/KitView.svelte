<!-- A kit's own page (#8).

     Built from the concept machinery rather than from a second renderer, so a kit's
     documentation cannot look different depending on where it was found: the views below
     are exactly the ones the guide uses for a borrowed kit's exports, and the concepts
     come from the same `kitShareConcepts`. -->
<script lang="ts">
    import KitExportView from '@components/concepts/KitExportView.svelte';
    import Notice from '@components/app/Notice.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import ConceptPreview from '@components/concepts/ConceptPreview.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import {
        getUser,
        setExampleScope,
        type ExampleScope,
    } from '@components/project/Contexts';
    import KitModerationNotice from '@components/moderation/KitModerationNotice.svelte';
    import ReportButton from '@components/project/ReportButton.svelte';
    import Button from '@components/widgets/Button.svelte';
    import { kitShareConcepts } from '@concepts/kitConcepts';
    import { DB, locales } from '@db/Database';
    import type { SerializedKit, SerializedKitVersion } from '@db/kits/Kit';
    import Project from '@db/projects/Project';
    import Source from '@nodes/Source';
    import { toProgram } from '@parser/parseProgram';
    import { dependencyKey, parseKitRef } from '@nodes/Borrow';
    import { BORROW_SYMBOL } from '@parser/Symbols';

    interface Props {
        /**
         * The kit's full `username/name`, as a borrow writes it after `@` — or its id.
         *
         * Either, because a moderation report and a decision notice carry the id and
         * nothing else, and sending a creator to the registry instead of to the kit the
         * decision was about is the wrong destination. A name always contains a `/`
         * (it is owner-scoped), so the two can never be confused.
         */
        name: string;
        /** Which version to show. The latest when absent. */
        version?: number | undefined;
        /** Show another version of this same kit. */
        show: (version: number | undefined) => void;
    }

    let { name, version = undefined, show }: Props = $props();

    /**
     * Who is reading, because it decides what they can see: an unlisted kit is visible to
     * its owner and to nobody else. Auth hydrates after the first render, so without this
     * the page asks before anyone is signed in, is told there is no such kit, and never
     * asks again — which is exactly what a creator opening their own unpublished kit saw.
     */
    const user = getUser();

    /** `undefined` while loading, `null` when there is no such kit. */
    let kit = $state<SerializedKit | null | undefined>(undefined);
    let published = $state<SerializedKitVersion | null | undefined>(undefined);

    $effect(() => {
        const wanted = name;
        const wantedVersion = version;
        // Read so this re-runs when sign-in settles. See `user` above.
        void $user;
        let cancelled = false;
        kit = undefined;
        published = undefined;
        DB.loadKits()
            .then(async (kits) => {
                const found = wanted.includes('/')
                    ? await kits.getByName(wanted)
                    : await kits.getByID(wanted);
                if (cancelled) return;
                kit = found ?? null;
                if (found === null || found === undefined) return;
                const which = wantedVersion ?? found.latest;
                const one = await kits.getVersion(found.id, which);
                if (!cancelled) published = one ?? null;
            })
            .catch(() => {
                if (!cancelled) kit = null;
            });
        return () => {
            cancelled = true;
        };
    });

    /**
     * A throwaway project holding just the kit's code, so its exports have a context to be
     * type-checked and documented in. The same trick the guide uses for its own project;
     * nothing here is ever saved.
     */
    const project = $derived(
        published == null
            ? undefined
            : Project.make(
                  null,
                  published.name,
                  new Source(published.sourceName, published.code),
                  [],
                  $locales.getLocales(),
              ),
    );

    const source = $derived(project?.getMain());

    const concepts = $derived(
        project === undefined || source === undefined
            ? []
            : kitShareConcepts(source, project.getContext(source), $locales),
    );

    /** The kit's own words: its source's doc, rendered whole rather than trimmed to a
     *  sentence. The registry tile is where the first sentence belongs. The doc carries
     *  the `⭐` example, so the example renders here and is not shown a second time. */
    const doc = $derived(
        source === undefined || source.expression.docs.isEmpty()
            ? undefined
            : source.expression.docs.getPreferredLocale($locales).markup,
    );

    /** The line a creator would write to use this, as a parsed borrow: the guide shows
     *  code through `ConceptPreview`, which is focusable and copyable, rather than as a
     *  string beside a clipboard button. */
    const borrow = $derived(
        published == null
            ? undefined
            : toProgram(`↓ @${kit?.name ?? name} ${published.version}`)
                  .borrows[0],
    );

    /**
     * What this kit's own examples need in scope.
     *
     * `UnexampledShare` requires every callable export to show a worked example, and a
     * worked example of a kit's function names that function — so an example built from
     * itself alone resolves nothing and this page reported `FunctionException` on the
     * very examples that document the kit. The prelude is the borrow a reader would have
     * to write anyway, and the version is already in hand, so the dependency is supplied
     * rather than fetched.
     */
    const exampleScope = $derived.by<ExampleScope | undefined>(() => {
        const current = kit;
        const shown = published;
        if (current == null || shown == null) return undefined;
        // A kit ref is the token as a borrow writes it, so it carries the `@`; the
        // registry entry's name does not.
        const ref = parseKitRef(`@${current.name}`);
        if (ref === undefined) return undefined;
        return {
            prelude: `${BORROW_SYMBOL} @${current.name} ${shown.version}`,
            dependencies: new Map([
                [
                    dependencyKey(ref, shown.version),
                    {
                        status: 'loaded',
                        source: new Source(shown.sourceName, shown.code),
                        kit: current.id,
                        version: shown.version,
                    },
                ],
            ]),
        };
    });
    // A getter rather than an effect that assigns: the kit loads asynchronously, so an
    // effect sets this *after* the examples have already mounted and built their
    // evaluators — which left the first kit page opened still reporting the exception
    // this exists to prevent. Reading through a getter means an example always sees the
    // current value whenever it asks.
    setExampleScope({
        get scope() {
            return exampleScope;
        },
    });

    /** Every version, newest first, so a reader can go back to one they depend on. */
    let versions = $state<number[]>([]);
    $effect(() => {
        const latest = kit?.latest ?? 0;
        versions = Array.from({ length: latest }, (_, i) => latest - i);
    });
</script>

{#if kit === undefined}
    <Spinning />
{:else if kit === null}
    <Notice text={(l) => l.ui.docs.kits.missing} />
{:else}
    <!-- The report control on the title's line, because a report is about the kit and
         not about whatever happens to be last on the page — under the final share it
         read as being about that share. The row matches `HeaderAndExplanation`'s own. -->
    <div class="title">
        <Subheader>{kit.name}</Subheader>
        {#if $user === null || $user === undefined || $user.uid !== kit.owner}
            <ReportButton kind="kit" subject={kit.id} name={kit.name} />
        {/if}
    </div>

    <!-- Only the owner, and only here: this page is the one place an unlisted kit can be
         read, so it is where its author will be when they wonder why nobody else can find
         it. To everyone else a kit's standing with the moderators is not their business. -->
    {#if $user !== null && $user !== undefined && $user.uid === kit.owner}
        <KitModerationNotice {kit} />
    {/if}

    {#if published === undefined}
        <Spinning />
    {:else if published === null}
        <Notice text={(l) => l.ui.docs.kits.missingVersion} />
    {:else}
        {#if doc}
            <MarkupHTMLView markup={doc} />
        {/if}

        <!-- The borrow line before the exports: someone who already knows what this kit
             is came for exactly this. -->
        {#if borrow}
            <ConceptPreview node={borrow} describe={false} />
        {/if}

        {#if concepts.length === 0}
            <Notice text={(l) => l.ui.docs.kits.nothing} />
        {:else}
            <!-- One bounded section per export, each named by a heading. The guide shows
                 one concept at a time, so these views head their own inner sections
                 ("Names", "Inputs") and never had to say where one export stops; stacked,
                 four exports gave eight sibling `h2`s and nothing naming the exports, so
                 a reader met `hueFor(input)` directly under the previous export's inputs
                 and could not tell it had started a new one. -->
            <div class="exports">
                {#each concepts as concept (concept)}
                    <KitExportView {concept} />
                {/each}
            </div>
        {/if}

        {#if versions.length > 1}
            <MarkupHTMLView markup={(l) => l.ui.docs.kits.versions} />
            <ul class="versions">
                {#each versions as number (number)}
                    <li>
                        {#if number === published.version}
                            <strong
                                >{$locales
                                    .concretize(
                                        (l) => l.ui.dialog.share.kit.version,
                                        { version: `${number}` },
                                    )
                                    .toText()}</strong
                            >
                        {:else}
                            <Button
                                tip={(l) => l.ui.docs.kits.version.tip}
                                action={() => show(number)}
                                >{$locales
                                    .concretize(
                                        (l) => l.ui.dialog.share.kit.version,
                                        { version: `${number}` },
                                    )
                                    .toText()}</Button
                            >
                        {/if}
                    </li>
                {/each}
            </ul>
        {/if}
    {/if}
{/if}

<style>
    /* A kit is code other people run, so whoever reads it can ask for it to be reviewed,
       exactly as they can a project or a character — but not its own author, whose report
       the callable refuses. Offering a control that always fails is worse than none. */
    .title {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--wordplay-spacing);
    }

    /* The gap owns the spacing between exports; each draws its own rule above it, and
       the first one's is suppressed here so the list doesn't open with a stray line. */
    .exports {
        display: flex;
        flex-direction: column;
        gap: calc(2 * var(--wordplay-spacing));
    }

    .exports > :global(section.export:first-child) {
        border-block-start: none;
        padding-block-start: 0;
    }

    .versions {
        list-style: none;
        padding: 0;
        display: flex;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
    }
</style>
