const TileKind = {
    Output: 'output',
    Documentation: 'docs',
    Source: 'source',
    Palette: 'palette',
    Collaborate: 'collaborate',
} as const;

export type TileKind = (typeof TileKind)[keyof typeof TileKind];

export { TileKind };
export default TileKind;
