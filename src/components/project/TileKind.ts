const TileKind = {
    Output: 'output',
    Documentation: 'docs',
    Source: 'source',
    Palette: 'palette',
    Collaborate: 'collaborate',
} as const;

export type TileKind = (typeof TileKind)[keyof typeof TileKind];

const TileKindValues: readonly TileKind[] = Object.values(TileKind);

/** Whether a tile id names a kind of tile (rather than a source). */
export function isTileKind(id: string): id is TileKind {
    return TileKindValues.some((kind) => kind === id);
}

export { TileKind };
export default TileKind;
