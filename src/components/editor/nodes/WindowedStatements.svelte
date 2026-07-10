<script lang="ts">
    /**
     * Text-mode windowing (virtualization) for the root block's statement list.
     * Renders only the statements intersecting the scroll viewport (plus a buffer),
     * with top/bottom spacer divs so the scroll container's total height — and the
     * native scrollbar — matches the full content. See windowModel.ts for the pure
     * geometry.
     *
     * The scroll choreography, in one place (each piece is motivated where it's
     * implemented; all of it exists because building a windowful of node views
     * costs ~100ms+ in WebKit, so per-frame work must be strictly bounded):
     *
     * - Heights start as line-count estimates and are replaced by measurements
     *   as statements render (`measured`), invalidated when any layout-affecting
     *   input changes (the "epoch": zoom, width, wrap, line numbers, indicators).
     * - Per scroll frame, the handler reads ONLY container.scrollTop (no rects, no
     *   forced layout) and commits a new window. The overscan buffer stretches in
     *   the scroll direction with velocity so flicks pre-mount what they reveal.
     * - While a gesture is in progress, the rendered range only GROWS (`held`), so
     *   nothing unmounts mid-scroll; SETTLE_MS after the last scroll event, it
     *   snaps back to the symmetric window in one pass (settleNow).
     * - Side-work (height measurement; the revision bumps that trigger editor-wide
     *   highlight/caret re-measurement) is throttled while scrolling and deferred
     *   entirely during scrubs — it otherwise starves the mounts the viewport is
     *   waiting on (see sideWorkAllowed).
     * - Disjoint jumps (a whole viewport+ per frame) are teleports: nothing between
     *   origin and destination was ever visible, so the window renders symmetric at
     *   the destination, throttled by the measured cost of the last rebuild.
     * - A held scrollbar THUMB (pointerdown on the container itself) renders live
     *   only while moving gently or when rebuilds are cheap; otherwise it renders
     *   exactly once, on release — macOS services thumb drags on the main thread,
     *   so a mid-drag rebuild freezes the thumb itself.
     * - Off-window nodes have no DOM; the Editor reaches them via the
     *   Contexts.WindowingBridge this component registers (scrollToNode + the
     *   revision counter its caches and outline effects re-run on).
     */
    import { getScrollContainer } from '@components/editor/caretDescriptionPosition';
    import {
        computeWindow,
        estimateSlotHeights,
        lineAt,
        lineStarts,
        perLineHeight,
        prefixSums,
        unionWindow,
    } from '@components/editor/util/windowModel';
    import {
        getEditor,
        getShowLines,
        getWindowing,
    } from '@components/project/Contexts';
    import { spaceIndicator, wrap } from '@db/Database';
    import Node from '@nodes/Node';
    import Source from '@nodes/Source';
    import { tick, untrack } from 'svelte';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        /** The root block's statements, in document order. */
        statements: Node[];
        format: Format;
    }
    let { statements, format }: Props = $props();

    // Overscan above/below the viewport. Smaller = fewer rendered tokens = snappier
    // caret (rendered DOM drives per-move cost), at the cost of possible brief blank
    // at the edges during a fast flick-scroll. Tune against responsiveness.
    const BUFFER_PX = 200;
    // Velocity-directional pre-render: during a flick, the overscan on the scroll-
    // direction side grows to BUFFER_PX + LEAD_FACTOR × |px per frame|, up to
    // MAX_LEAD, so the content the viewport is about to reveal is already mounted.
    // The trailing side stays at BUFFER_PX. DECAY keeps the lead from collapsing
    // (and remounting) the instant a flick pauses; SETTLE_MS after the last scroll
    // frame, velocity zeroes and deferred measurement catches up.
    const LEAD_FACTOR = 5;
    const MAX_LEAD = 1200;
    const DECAY = 0.8;
    // How fast velocity ramps TOWARD a larger delta (0..1]. Below 1 spreads the
    // flick's initial mount burst over the first few frames instead of paying one
    // long synchronous mount while the compositor scrolls past it.
    const ATTACK = 0.5;
    const SETTLE_MS = 150;
    // While a scroll gesture is in progress, side-work (height measurement and the
    // revision bumps that trigger editor-wide highlight/caret re-measurement) runs
    // at most this often, plus once at settle — regardless of scroll speed. Any
    // faster and it starves the statement mounts the viewport is waiting on.
    const WORK_THROTTLE_MS = 250;
    // During rapid wheel-driven jumps (per-frame deltas bigger than the
    // viewport), the window lands somewhere fully DISJOINT each frame — rebuilding
    // it would be a full teardown + rebuild per frame, which IS the lag. So
    // disjoint rebuilds commit at most this often — stretched adaptively to ~2×
    // the last rebuild's measured cost, so an engine whose rebuilds are slow
    // (WebKit is ~3× Blink here) lets scrolling run free between renders instead
    // of stuttering through back-to-back long tasks. A trailing retry guarantees
    // the final position always commits. (Scrollbar THUMB drags don't use this at
    // all — they render exactly once, on release; see thumbHeld.)
    const SCRUB_THROTTLE_MS = 150;
    const SCRUB_COST_FACTOR = 2;
    // Live preview during a held-thumb drag is UNRESTRICTED only when a full
    // rebuild (script + style + layout + paint) fits well within a drag's frame
    // budget. macOS services thumb drags on the main thread, so slower engines
    // (WebKit is ~3× Blink here) would freeze the thumb on every rebuild and tear
    // mid-paint. Measured, not UA-sniffed — an engine that gets faster
    // auto-upgrades. The first drag of a session commits once to seed the
    // measurement.
    const SCRUB_LIVE_BUDGET_MS = 50;
    // On slow engines a held thumb still live-previews while it moves GENTLY —
    // at most this many lines per frame, the same incremental strip-mounting
    // wheel scrolling does cheaply. Faster thumb movement defers rendering until
    // it slows or releases (one catch-up rebuild resumes the preview).
    const THUMB_LIVE_LINES_PER_FRAME = 3;

    let wrapper = $state<HTMLElement | null>(null);
    let topSpacerEl = $state<HTMLElement | null>(null);
    let container = $state<HTMLElement | null>(null);

    let source = $derived(
        format.root?.root instanceof Source ? format.root.root : undefined,
    );

    // Line index + each statement's first character offset (recomputed per source/edit).
    let starts = $derived(
        source ? lineStarts(source.getCode().toString()) : [0],
    );
    // The `?? 0` is a soft spot: a position-less statement would map to line 0 and
    // corrupt neighboring spans — but real Source statements always have positions.
    let firstOffsets = $derived(
        source
            ? statements.map((s) => source!.getNodeFirstPosition(s) ?? 0)
            : statements.map(() => 0),
    );
    // Each statement's first source line, for line-span arithmetic in measureRendered.
    let firstLines = $derived(firstOffsets.map((o) => lineAt(starts, o)));

    // The line just past the final statement's last line. Trailing blank lines
    // after it belong to the End token (rendered separately, after this block), so
    // the last statement's height estimate must stop here rather than at the end of
    // the source — otherwise the bottom spacer double-counts them.
    let lastContentLine = $derived.by(() => {
        const last =
            source && statements.length > 0
                ? source.getNodeLastPosition(statements[statements.length - 1])
                : undefined;
        return last === undefined ? starts.length : lineAt(starts, last) + 1;
    });

    // Measured line height (px). Falls back to a sane default until measured.
    let lineHeight = $state(24);

    // Measured slot heights keyed by statement id; replaces the estimate as
    // statements render (see measureRendered).
    let measured = $state.raw(new Map<number, number>());

    // Layout epoch: anything that changes rendered statement heights invalidates
    // every cached measurement — zoom (editor font size), container width and wrap
    // mode (line wrapping), line numbers, and space indicators. Without this, the
    // measured-id skip in measureRendered keeps the stale geometry forever.
    const editorContext = getEditor();
    const showLines = getShowLines();
    let containerWidth = $state(0);
    let lastEpoch: string | undefined = undefined;
    $effect(() => {
        const epoch = `${$editorContext?.zoom ?? 0}|${containerWidth}|${$wrap}|${$showLines}|${$spaceIndicator}`;
        // Skip the first run: mount shouldn't clear (or re-create) the empty map.
        if (lastEpoch !== undefined && epoch !== lastEpoch) {
            measured = new Map();
            // Content above the statements may have reflowed too.
            measureGeometry();
        }
        lastEpoch = epoch;
    });

    let heights = $derived.by(() => {
        const est = estimateSlotHeights(
            firstOffsets,
            starts,
            lineHeight,
            lastContentLine,
        );
        return statements.map((s, i) => measured.get(s.id) ?? est[i]);
    });
    // Cumulative offsets, recomputed only when heights change (measurement,
    // edits, epoch), not per scroll frame. The window derivation binary-searches
    // this instead of scanning heights.
    let prefix = $derived(prefixSums(heights));

    // Viewport top relative to the statements' coordinate space + viewport height.
    let scrollTop = $state(0);
    let viewportHeight = $state(0);

    // Signed scroll velocity in px per frame (see the constants above). Zero at
    // rest, which makes the buffers symmetric — bit-for-bit today's behavior.
    let velocity = $state(0);
    let bufferLead = $derived(
        Math.min(MAX_LEAD, BUFFER_PX + LEAD_FACTOR * Math.abs(velocity)),
    );
    let win = $derived(
        computeWindow(
            prefix,
            scrollTop,
            viewportHeight,
            // Scrolling up reveals content above; scrolling down, below.
            velocity < 0 ? bufferLead : BUFFER_PX,
            velocity > 0 ? bufferLead : BUFFER_PX,
        ),
    );
    // While scrolling, the rendered range only GROWS (the union of every window
    // the gesture has passed through, tracked by the scroll handler): unmounting
    // mid-scroll competes with the mounts the viewport is waiting on, and the
    // decaying lead buffer would otherwise retreat and remount the same
    // statements. At settle (or on a teleport) `held` clears and the range snaps
    // back to the symmetric window.
    let held = $state<{ first: number; last: number } | null>(null);
    let renderedWin = $derived(
        held === null ? win : unionWindow(prefix, win, held.first, held.last),
    );
    let visible = $derived(
        renderedWin.last < renderedWin.first
            ? []
            : statements.slice(renderedWin.first, renderedWin.last + 1),
    );

    /** The distance from the container's content origin (scroll offset 0) to the
     *  statements region's origin (the top spacer's top; its own top is fixed by
     *  the layout above it — changing its HEIGHT pushes content below, not
     *  itself). Scroll-invariant, and it only changes when content ABOVE the
     *  statements reflows (zoom, resize, font loads) — so it's measured
     *  explicitly by measureGeometry() rather than per scroll frame: reading
     *  rects on a dirty tree forces a full synchronous layout of the editor's
     *  (large) inline content, and paying that inside every scroll frame was a
     *  dominant WebKit cost. The per-frame path reads only container.scrollTop,
     *  which forces nothing. */
    let originOffset = 0;

    function syncScrollTop() {
        if (container === null) return;
        scrollTop = container.scrollTop - originOffset;
    }

    function measureGeometry() {
        if (container === null || topSpacerEl === null) return;
        const cRect = container.getBoundingClientRect();
        originOffset =
            container.scrollTop +
            (topSpacerEl.getBoundingClientRect().top - cRect.top);
        viewportHeight = container.clientHeight;
        syncScrollTop();
    }

    // Measure each statement's slot height ONCE, CONSISTENTLY, as the gap to the
    // next visible statement's top (captures leading whitespace/newlines). Two
    // invariants that keep this stable (no oscillation, no per-scroll DOM churn):
    //  1. Only `nextTop − top` — never a statement's own bottom−top. Measuring the
    //     last visible statement differently would make its cached height FLIP as it
    //     transitions last↔middle on scroll, churning heights→win→visible forever.
    //     The last visible statement is simply left on its estimate until it's not
    //     last (a future scroll position measures it).
    //  2. Skip statements already measured — heights are scroll/spacer-invariant, so
    //     once measured they never change; steady-state scrolling does zero DOM work.
    async function measureRendered() {
        await tick();
        if (wrapper === null || visible.length < 2) return;
        // Nothing to do if every statement except the (never-measured) last is cached.
        if (!visible.slice(0, -1).some((s) => !measured.has(s.id))) return;

        // One pass over the statement-level views (direct children of the
        // wrapper). A per-statement querySelector would rescan the whole rendered
        // subtree for every statement — O(rendered²) — which stalls for hundreds
        // of ms once the held range keeps a long scroll's worth mounted.
        const views = new Map<string, HTMLElement>();
        for (const el of wrapper.querySelectorAll(':scope > .node-view'))
            if (el instanceof HTMLElement && el.dataset.id !== undefined)
                views.set(el.dataset.id, el);

        const tops: { id: number; top: number; index: number }[] = [];
        for (const [i, s] of visible.entries()) {
            const el = views.get(`${s.id}`);
            if (el !== undefined)
                tops.push({
                    id: s.id,
                    top: el.getBoundingClientRect().top,
                    index: renderedWin.first + i,
                });
        }
        if (tops.length < 2) return;

        const next = new Map(measured);
        let changed = false;
        const gaps: { px: number; lines: number }[] = [];
        for (let i = 0; i + 1 < tops.length; i++) {
            const px = tops[i + 1].top - tops[i].top;
            gaps.push({
                px,
                lines:
                    (firstLines[tops[i + 1].index] ?? 0) -
                    (firstLines[tops[i].index] ?? 0),
            });
            if (next.has(tops[i].id)) continue;
            const h = Math.round(px);
            // Reject negative or absurd values (a transient bad layout). Zero is
            // legitimate: two statements sharing a line have a zero-height slot.
            if (h >= 0 && h < 5000) {
                next.set(tops[i].id, h);
                changed = true;
            }
        }
        // Refine the line height from the smallest per-line ratio (pixel gap ÷
        // source-line span) — never from a raw gap, which for a multi-line or
        // blank-line-led statement is a MULTIPLE of the line height and would
        // inflate every unmeasured estimate.
        const lh = perLineHeight(gaps);
        if (lh !== undefined && Math.round(lh) !== Math.round(lineHeight))
            lineHeight = Math.round(lh);
        if (changed) measured = next;
    }

    // Wire the scroll container once the (real) top spacer mounts.
    let rafPending = false;
    let settleTimer: ReturnType<typeof setTimeout> | undefined = undefined;
    let scrubTimer: ReturnType<typeof setTimeout> | undefined = undefined;
    let lastCommitTime = 0;
    // The measured cost (ms) of the last disjoint rebuild: commit → next frame,
    // capturing the synchronous Svelte flush + layout + paint it triggered.
    let lastRebuildCost = 0;
    // True while a scroll gesture is in progress (any scroll event within
    // SETTLE_MS). This — not velocity — is what gates the side-work throttles:
    // teleports (scrubs) zero the velocity for buffer geometry, which would
    // otherwise make every scrub commit ALSO pay measurement + the editor-wide
    // revision re-measure, choking the scrollbar thumb between rebuilds.
    let scrollActive = false;
    // Whether the last committed frame was a disjoint jump (a scrub step). A
    // scrub's windows are transient — replaced within the next interval — so
    // mid-scrub revision bumps (editor-wide highlight/caret re-measurement for
    // content about to vanish) are pure waste and always defer to settle.
    let lastCommitDisjoint = false;

    /** Whether throttled scroll side-work (height measurement, revision bumps)
     *  may run now: always when not scrolling; never mid-scrub or with the thumb
     *  held (those windows are transient — settle catches up); otherwise at most
     *  every WORK_THROTTLE_MS since `lastTime`. Callers record their own last-run
     *  time when they proceed. */
    function sideWorkAllowed(lastTime: number): boolean {
        if (!scrollActive) return true;
        if (lastCommitDisjoint || thumbHeld) return false;
        return performance.now() - lastTime > WORK_THROTTLE_MS;
    }
    // True while the scrollbar thumb is held (pointerdown on the container
    // itself); rendering defers to release unless the thumb moves gently.
    // See onPointerDown and THUMB_LIVE_LINES_PER_FRAME.
    let thumbHeld = false;
    // The previous frame's probed position, for the thumb's frame-to-frame speed.
    let lastProbedTop = 0;
    let measureNonce = $state(0);
    // A window-boundary crossing happened mid-flick; the revision bump it owes the
    // Editor is deferred to the settle timer (see the revision effect below).
    let revisionPending = false;
    $effect(() => {
        if (topSpacerEl === null) return;
        const c = getScrollContainer(topSpacerEl);
        container = c;
        measureGeometry();
        if (c === null) return;
        // Run the settle work now: snap to the symmetric window at the true final
        // position (one unmount pass), let deferred measurement catch up, and fire
        // any revision bump the gesture deferred (so highlights/caret re-measure
        // exactly once).
        const settleNow = () => {
            scrollActive = false;
            velocity = 0;
            held = null;
            measureGeometry();
            measureNonce++;
            if (revisionPending) {
                revisionPending = false;
                windowing?.revision.update((n) => n + 1);
            }
        };
        const onScroll = () => {
            if (rafPending) return;
            rafPending = true;
            requestAnimationFrame(() => {
                rafPending = false;
                if (container === null || topSpacerEl === null) return;
                scrollActive = true;
                // Probe the new position WITHOUT committing it to state yet, so a
                // rapid jump-sequence can skip the frame entirely. Reads only
                // scrollTop — no rects, no forced layout (see originOffset above).
                const newScrollTop = container.scrollTop - originOffset;
                const delta = newScrollTop - scrollTop;
                // A held thumb on a slow engine live-previews only while moving
                // gently (frame-to-frame speed, NOT delta-from-state — the state
                // goes stale while frames are skipped, and rendering must resume
                // when the user slows down). Faster movement renders on
                // release/slowdown instead: mid-drag rebuilds freeze the thumb
                // (main-thread-serviced on macOS) and tear mid-paint.
                const speed = Math.abs(newScrollTop - lastProbedTop);
                lastProbedTop = newScrollTop;
                if (
                    thumbHeld &&
                    lastRebuildCost > SCRUB_LIVE_BUDGET_MS &&
                    speed > lineHeight * THUMB_LIVE_LINES_PER_FRAME
                )
                    return;
                const disjoint = Math.abs(delta) > viewportHeight;
                const now = performance.now();
                const scrubInterval = Math.max(
                    SCRUB_THROTTLE_MS,
                    lastRebuildCost * SCRUB_COST_FACTOR,
                );
                if (disjoint && now - lastCommitTime < scrubInterval) {
                    // Rapid jumps: skip this frame's rebuild and retry once the
                    // throttle expires, so scrolling stays responsive and the
                    // final position always renders (via the retry or settle).
                    clearTimeout(scrubTimer);
                    scrubTimer = setTimeout(
                        onScroll,
                        Math.min(scrubInterval, 300),
                    );
                } else {
                    lastCommitTime = now;
                    const prevWin = win;
                    scrollTop = newScrollTop;
                    lastCommitDisjoint = disjoint;
                    if (disjoint) {
                        // Teleport (scrub step, programmatic reveal): not a
                        // continuous scroll — nothing between origin and
                        // destination was ever visible, so render symmetrically at
                        // the destination rather than the whole traversed span.
                        velocity = 0;
                        held = null;
                        // Time this rebuild (through the flush/layout/paint it
                        // causes) so the next scrub frame can pace itself.
                        requestAnimationFrame(() => {
                            lastRebuildCost = performance.now() - now;
                        });
                    } else {
                        // Track per-frame velocity: ramp toward a larger delta
                        // (ATTACK spreads the initial mount burst over a few
                        // frames, and handles direction reversals); otherwise
                        // decay, keeping the lead buffer up through brief pauses.
                        velocity =
                            Math.abs(delta) > Math.abs(velocity) * DECAY
                                ? velocity + (delta - velocity) * ATTACK
                                : velocity * DECAY;
                        // Grow the held range over everything the gesture has
                        // shown, including the pre-scroll window, so nothing
                        // unmounts mid-scroll.
                        held = {
                            first: Math.min(
                                held?.first ?? prevWin.first,
                                prevWin.first,
                                win.first,
                            ),
                            last: Math.max(
                                held?.last ?? prevWin.last,
                                prevWin.last,
                                win.last,
                            ),
                        };
                        // Bound the held range: per-frame layout cost scales with
                        // the rendered volume, so a long drag must not accumulate
                        // the whole document. Beyond ~3 viewports of slack per
                        // side (statements are ≥1 line each), trim back toward
                        // the window.
                        const slack = Math.ceil(
                            (3 * viewportHeight) / Math.max(1, lineHeight),
                        );
                        held = {
                            first: Math.max(held.first, win.first - slack),
                            last: Math.min(held.last, win.last + slack),
                        };
                    }
                }
                clearTimeout(settleTimer);
                settleTimer = setTimeout(settleNow, SETTLE_MS);
            });
        };
        c.addEventListener('scroll', onScroll, { passive: true });
        // Scrollbar-thumb tracking: a pointerdown whose target is the scroll
        // container ITSELF is on its scrollbar (or padding) — presses on content
        // hit descendant elements. While held, rendering is fully deferred; the
        // release renders the final position once.
        const onPointerDown = (e: PointerEvent) => {
            if (e.target === c && e.button === 0) thumbHeld = true;
        };
        const onPointerUp = () => {
            if (!thumbHeld) return;
            thumbHeld = false;
            clearTimeout(settleTimer);
            clearTimeout(scrubTimer);
            // Render only if the held gesture actually scrolled.
            if (scrollActive) settleNow();
        };
        c.addEventListener('pointerdown', onPointerDown, true);
        window.addEventListener('pointerup', onPointerUp, true);
        window.addEventListener('pointercancel', onPointerUp, true);
        const ro = new ResizeObserver(() => {
            // Track width for the layout epoch: a narrower container re-wraps
            // lines, changing every measured height.
            containerWidth = c.clientWidth;
            measureGeometry();
        });
        ro.observe(c);
        containerWidth = c.clientWidth;
        return () => {
            c.removeEventListener('scroll', onScroll);
            c.removeEventListener('pointerdown', onPointerDown, true);
            window.removeEventListener('pointerup', onPointerUp, true);
            window.removeEventListener('pointercancel', onPointerUp, true);
            ro.disconnect();
            clearTimeout(settleTimer);
            clearTimeout(scrubTimer);
        };
    });

    // Re-measure whenever the visible set or source changes — but while a scroll
    // gesture is in progress, at most every WORK_THROTTLE_MS: measurement
    // (querySelector + getBoundingClientRect per statement) competes with the
    // mounts the viewport is waiting on, and the estimates hold the geometry fine
    // until the settle timer bumps measureNonce for the catch-up pass. Velocity is
    // read untracked so this doesn't re-run every scroll frame. (scrollToNode's
    // direct measureRendered() calls stay unconditional — its convergence
    // depends on refined heights.)
    let lastMeasureTime = 0;
    $effect(() => {
        void visible;
        void starts;
        measureNonce;
        if (untrack(() => sideWorkAllowed(lastMeasureTime))) {
            lastMeasureTime = performance.now();
            measureRendered();
        }
    });

    // --- Off-window reachability bridge (see Contexts.WindowingBridge) ---
    const windowing = getWindowing();

    /** Monotonic generation for scrollToNode: a newer call supersedes any loop
     *  still awaiting, so concurrent reveals can't interleave scrollTop writes. */
    let scrollGeneration = 0;

    /** Scroll the container so `node`'s root statement renders, resolving once the
     *  node's element is in the DOM. Off-window nodes have no element, so every
     *  "scroll to / highlight a node" path in the Editor calls this first. Returns
     *  false when the node isn't in this windowed list. */
    async function scrollToNode(node: Node): Promise<boolean> {
        if (container === null || wrapper === null || source === undefined)
            return false;
        const rendered = () =>
            wrapper?.querySelector(`.node-view[data-id="${node.id}"]`) ?? null;
        if (rendered() !== null) return true; // already on screen

        // Which entry of `statements` contains the node? Track it by id so the
        // loop can re-resolve it if an edit replaces the statements array mid-flight.
        const ids = new Set(statements.map((s) => s.id));
        const statement = source.root
            .getSelfAndAncestors(node)
            .find((n) => ids.has(n.id));
        if (statement === undefined) return false;
        const statementId = statement.id;

        // Scroll toward the statement, centered. The target offset comes from
        // `heights`, which are ESTIMATES until statements render — so measure the
        // region we just scrolled through each pass (measureRendered refines the
        // heights → the next pass's cumulative offset is more accurate), converging
        // on the true position. Steps by the delta because the statements region
        // isn't at the container's scroll origin.
        const gen = ++scrollGeneration;
        let lastScroll = -1;
        let lastWritten: number | undefined = undefined;
        for (let attempt = 0; attempt < 10 && rendered() === null; attempt++) {
            // A newer scrollToNode call supersedes this loop.
            if (gen !== scrollGeneration) break;
            // The scroll position moved since our last write: the user (wheel,
            // trackpad) wins over the programmatic reveal. Tolerate corrections
            // smaller than half a line (scroll anchoring, clamping).
            if (
                lastWritten !== undefined &&
                Math.abs(container.scrollTop - lastWritten) > lineHeight / 2
            )
                break;
            // Re-resolve the index: an edit may have replaced the statements array
            // (and removed the statement entirely) while we were awaiting.
            const index = statements.findIndex((s) => s.id === statementId);
            if (index < 0) break;
            const offset = prefix[index];
            const height = prefix[index + 1] - prefix[index];
            const target = Math.max(
                0,
                offset - Math.max(0, (viewportHeight - height) / 2),
            );
            const next = container.scrollTop + (target - scrollTop);
            // Converged: the estimate stopped moving but the target still isn't in
            // the buffer — stop rather than spin (an unmeasurable/huge statement).
            if (Math.abs(next - lastScroll) < 1 && attempt > 0) break;
            lastScroll = next;
            container.scrollTop = next;
            // Read back what the browser kept (it may clamp), so the user-scroll
            // check above compares against the real position.
            lastWritten = container.scrollTop;
            syncScrollTop();
            await tick();
            await measureRendered();
        }
        return rendered() !== null;
    }

    // Register the bridge while mounted, and unregister on teardown so a
    // non-windowed editor reports no bridge.
    $effect(() => {
        windowing?.scrollToNode.set(scrollToNode);
        return () => windowing?.scrollToNode.set(undefined);
    });

    // Tell the Editor when the RENDERED set changes (a statement (un)mounted), so
    // it re-measures highlights and clears its node-view cache for the statements
    // that just (un)rendered. Guarded on the range bounds so it fires only on
    // boundary crossings — not on every scroll/resize frame. And while a scroll
    // gesture is in progress, at most every WORK_THROTTLE_MS: each bump triggers
    // editor-wide re-measurement (caret location with its forced layouts, outline
    // re-measure, token-view cache rebuild) that starves the statement mounts and
    // makes content paint visibly late. The settle timer fires the final deferred
    // bump when the gesture ends.
    let lastFirst = -1;
    let lastLast = -2;
    let lastRevisionTime = 0;
    $effect(() => {
        if (renderedWin.first !== lastFirst || renderedWin.last !== lastLast) {
            lastFirst = renderedWin.first;
            lastLast = renderedWin.last;
            if (untrack(() => sideWorkAllowed(lastRevisionTime))) {
                lastRevisionTime = performance.now();
                revisionPending = false;
                windowing?.revision.update((n) => n + 1);
            } else {
                revisionPending = true;
            }
        }
    });

    // After an edit replaces the statements array: prune measurements whose ids no
    // longer exist (edited statements are new nodes with new ids, so the map would
    // otherwise grow unboundedly) and bump the revision so the Editor's element
    // caches reflect the new nodes even when the window INDICES happen to be
    // identical (the guard above wouldn't fire). Scroll/resize never replaces the
    // array, so this adds nothing to the per-frame path.
    let lastStatements: Node[] | undefined = undefined;
    $effect(() => {
        if (lastStatements !== undefined && statements !== lastStatements) {
            untrack(() => {
                const ids = new Set(statements.map((s) => s.id));
                if ([...measured.keys()].some((id) => !ids.has(id))) {
                    const pruned = new Map<number, number>();
                    for (const [id, h] of measured)
                        if (ids.has(id)) pruned.set(id, h);
                    measured = pruned;
                }
                // The held range is positional; an edit shifts what the indices
                // mean, so drop it rather than hold a misaligned span.
                held = null;
                windowing?.revision.update((n) => n + 1);
            });
        }
        lastStatements = statements;
    });
</script>

<div bind:this={wrapper} class="windowed">
    <div
        bind:this={topSpacerEl}
        class="spacer"
        style="height: {renderedWin.topHeight}px"
    ></div>
    {#each visible as node, i (node.id)}
        <NodeView {node} {format} index={renderedWin.first + i} />
    {/each}<!-- Only render the bottom spacer when it actually reserves space.
         At the very bottom bottomHeight is exactly 0 (last statement's end ==
         total content height), and a zero-height block box still ends the inline
         context — which pushes the End token's trailing space (rendered after the
         block, outside it) onto a stray fragmented extra line. Omitting the empty
         spacer lets that trailing space flow inline right after the last statement. -->{#if renderedWin.bottomHeight > 0}<div
            class="spacer"
            style="height: {renderedWin.bottomHeight}px"
        ></div>{/if}
</div>

<style>
    /* The wrapper stays part of the inline flow; spacers are block boxes that
       reserve the off-screen vertical space so the scrollbar geometry is correct. */
    .windowed {
        display: contents;
    }
    .spacer {
        display: block;
        width: 0;
    }
</style>
