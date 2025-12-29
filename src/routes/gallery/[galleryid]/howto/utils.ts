const buffer: number = 16;
const maxOutside: number = 10000;

// TODO(@mc): do need to make this more efficient for larger datasets
export function movePermitted(
    targetX: number,
    targetY: number,
    width: number,
    height: number,
    selfId: string | undefined,
    notPermittedAreas: Map<string, [number, number, number, number]>,
): boolean {
    if (notPermittedAreas.size <= 1) return true;

    let tooFar: boolean = true;

    for (let [id, [x, y, w, h]] of notPermittedAreas) {
        if (selfId && id === selfId) continue;

        // we do not allow how-to previews to overlap each other (include a buffer)
        if (
            !(
                targetX + width + buffer <= x ||
                targetX - buffer >= x + w ||
                targetY + height + buffer <= y ||
                targetY - buffer >= y + h
            )
        ) {
            return false;
        }

        // we also don't allow how-to previews to move too far away from any other preview
        // start by assuming that it is far from every preview. if that is not the case, then update the tracker variable
        if (tooFar && Math.hypot(targetX - x, targetY - y) <= maxOutside) {
            tooFar = false;
        }
    }

    return !tooFar;
}