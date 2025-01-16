import {
    COLLABORATE_SYMBOL,
    DOCUMENTATION_SYMBOL,
    PALETTE_SYMBOL,
    SOURCE_SYMBOL,
    STAGE_SYMBOL,
} from '@parser/Symbols';
import type { TileKind } from './Tile';

type TileKindMeta = {
    symbol: string;
    order: number;
};

const TileKinds: { [ID in TileKind]: TileKindMeta } = {
    output: { symbol: STAGE_SYMBOL, order: 1 },
    docs: { symbol: DOCUMENTATION_SYMBOL, order: 2 },
    palette: { symbol: PALETTE_SYMBOL, order: 3 },
    source: { symbol: SOURCE_SYMBOL, order: 0 },
    collaborate: { symbol: COLLABORATE_SYMBOL, order: 4 },
};

export default TileKinds;
