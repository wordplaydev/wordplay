/** Minimum spacing between two how-to previews on the canvas. */
const buffer: number = 16;
/** Maximum distance a how-to is allowed to be from the nearest other one.
 *  Keeps the canvas usable: a user can't drop a how-to off into the void
 *  and lose it, and the placement helper anchors new how-tos near the
 *  existing cluster when the camera is panned far away. */
const maxOutside: number = 10000;

type Rect = [number, number, number, number]; // [x, y, width, height]

function rectsOverlap(
    ax: number,
    ay: number,
    aw: number,
    ah: number,
    bx: number,
    by: number,
    bw: number,
    bh: number,
): boolean {
    return !(
        ax + aw + buffer <= bx ||
        ax - buffer >= bx + bw ||
        ay + ah + buffer <= by ||
        ay - buffer >= by + bh
    );
}

/**
 * Whether a how-to with the given size at (targetX, targetY) is in a
 * valid resting position, given the current set of how-to occupancy
 * rects.
 *
 * Rules:
 *  - The target must not overlap any other how-to (with a small buffer).
 *  - The target must be within `maxOutside` of at least one other how-to
 *    (keeps the canvas tidy and findable — a dropped how-to that ended
 *    up in the void gets snapped back to the cluster instead).
 *
 * This is the *resting-state* check, used by the placement-search to
 * find an empty slot and by the drop handler to decide whether a
 * dragged how-to needs to be snapped. It is **not** consulted during
 * the drag itself — drags are unconstrained so the cursor never fights
 * the user, and any collision the user releases on is resolved at drop
 * time by spiraling outward from the drop point with
 * {@link findHowToPlacement}.
 */
export function movePermitted(
    targetX: number,
    targetY: number,
    width: number,
    height: number,
    selfId: string | undefined,
    notPermittedAreas: Map<string, Rect>,
): boolean {
    // No other how-tos (or only self) — any position is fine.
    if (
        notPermittedAreas.size < 1 ||
        (notPermittedAreas.size === 1 && selfId !== undefined)
    )
        return true;

    let tooFar = true;

    for (const [id, [x, y, w, h]] of notPermittedAreas) {
        if (selfId && id === selfId) continue;

        if (rectsOverlap(targetX, targetY, width, height, x, y, w, h))
            return false;

        if (tooFar && Math.hypot(targetX - x, targetY - y) <= maxOutside) {
            tooFar = false;
        }
    }

    return !tooFar;
}

/**
 * If the dropped position overlaps another tile, snap to the nearest of
 * that tile's four edges with the standard inter-tile spacing applied.
 * The user dropped *near* another tile — preserving that locality (and
 * snapping in the shortest direction) is much less disorienting than
 * spiraling off to some arbitrary empty slot via
 * {@link findHowToPlacement}.
 *
 * Returns null when:
 *   - the drop point overlaps nothing (caller should keep the drop point), or
 *   - every candidate edge-snap still overlaps something else (caller
 *     should fall back to {@link findHowToPlacement} for a wider search).
 */
export function snapToNearestEdge(
    droppedX: number,
    droppedY: number,
    width: number,
    height: number,
    selfId: string | undefined,
    notPermittedAreas: Map<string, Rect>,
): [number, number] | null {
    let target: Rect | null = null;
    for (const [id, rect] of notPermittedAreas) {
        if (selfId && id === selfId) continue;
        const [ox, oy, ow, oh] = rect;
        if (rectsOverlap(droppedX, droppedY, width, height, ox, oy, ow, oh)) {
            target = rect;
            break;
        }
    }
    if (target === null) return null;

    const [ox, oy, ow, oh] = target;
    // Four candidates: just past each edge of the target, on the same
    // axis as the drop position. `buffer` matches the natural gap two
    // adjacent tiles end up with (each one's margin contributes half),
    // so the snap looks the same as a deliberately-placed neighbor.
    const candidates: [number, number][] = [
        [ox - width - buffer, droppedY], // left of target
        [ox + ow + buffer, droppedY], // right of target
        [droppedX, oy - height - buffer], // above target
        [droppedX, oy + oh + buffer], // below target
    ];

    let best: [number, number] | null = null;
    let bestDist = Infinity;
    for (const [cx, cy] of candidates) {
        if (!movePermitted(cx, cy, width, height, selfId, notPermittedAreas))
            continue;
        const dist = Math.hypot(cx - droppedX, cy - droppedY);
        if (dist < bestDist) {
            bestDist = dist;
            best = [cx, cy];
        }
    }
    return best;
}

/**
 * Pick a placement for a how-to that won't pile onto existing ones and
 * won't strand the how-to off in space.
 *
 * Strategy:
 *  1. Anchor at the requested point if that's within `maxOutside` of
 *     any existing how-to; otherwise anchor at the cluster's centroid
 *     (so a far-panned camera or a wild drop doesn't leave the how-to
 *     in the middle of nowhere).
 *  2. Try the anchor itself, then spiral outward through 12 rings × 8
 *     compass directions (96 candidate positions).
 *  3. If every candidate collides, fall back to a position just to the
 *     right of the cluster's bounding box — guaranteed non-overlapping
 *     (nothing extends past its own bounds) and in-range (right next to
 *     a known how-to).
 *
 * `selfId` is the id of the how-to being placed when adjusting an
 * existing how-to's position (drag-and-drop snap). Pass undefined for
 * a brand-new how-to that doesn't yet appear in `notPermittedAreas`.
 *
 * Never returns a colliding or out-of-range position — every code path
 * yields somewhere safe.
 */
export function findHowToPlacement(
    notPermittedAreas: Map<string, Rect>,
    anchorX: number,
    anchorY: number,
    probeWidth: number,
    probeHeight: number,
    selfId?: string,
): [number, number] {
    // First how-to in the gallery — drop it wherever the user is looking.
    if (
        notPermittedAreas.size === 0 ||
        (notPermittedAreas.size === 1 && selfId !== undefined)
    ) {
        return [anchorX, anchorY];
    }

    let searchX = anchorX;
    let searchY = anchorY;
    if (!withinClusterRange(anchorX, anchorY, notPermittedAreas, selfId)) {
        [searchX, searchY] = clusterCentroid(notPermittedAreas, selfId);
    }

    const probe = (x: number, y: number) =>
        movePermitted(x, y, probeWidth, probeHeight, selfId, notPermittedAreas);

    if (probe(searchX, searchY)) return [searchX, searchY];

    const step = 150;
    const maxRing = 12;
    for (let ring = 1; ring <= maxRing; ring++) {
        for (let i = 0; i < 8; i++) {
            const theta = (i * Math.PI) / 4;
            const x = searchX + ring * step * Math.cos(theta);
            const y = searchY + ring * step * Math.sin(theta);
            if (probe(x, y)) return [x, y];
        }
    }

    // Spiral exhausted. Drop just to the right of the cluster's
    // bounding box (excluding self if dragging).
    let right = -Infinity;
    let top = Infinity;
    for (const [id, [x, y, w]] of notPermittedAreas) {
        if (selfId && id === selfId) continue;
        if (x + w > right) right = x + w;
        if (y < top) top = y;
    }
    return [right + step, top];
}

function withinClusterRange(
    x: number,
    y: number,
    areas: Map<string, Rect>,
    selfId: string | undefined,
): boolean {
    for (const [id, [hx, hy]] of areas) {
        if (selfId && id === selfId) continue;
        if (Math.hypot(x - hx, y - hy) <= maxOutside) return true;
    }
    return false;
}

function clusterCentroid(
    areas: Map<string, Rect>,
    selfId: string | undefined,
): [number, number] {
    let sumX = 0;
    let sumY = 0;
    let count = 0;
    for (const [id, [x, y, w, h]] of areas) {
        if (selfId && id === selfId) continue;
        sumX += x + w / 2;
        sumY += y + h / 2;
        count++;
    }
    if (count === 0) return [0, 0];
    return [sumX / count, sumY / count];
}
