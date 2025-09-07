export type BasisTypeName =
    | 'unparsable'
    | 'unknown'
    | 'any'
    | 'never'
    | 'none'
    | 'exception'
    | 'boolean'
    | 'measurement'
    | 'unit'
    | 'text'
    | 'list'
    | 'set'
    | 'map'
    | 'table'
    | typeof StructureTypeName
    | 'column'
    | 'stream'
    | 'streamdefinition'
    | 'structuredefinition'
    | 'conversion'
    | 'function'
    | 'union'
    | 'variable'
    | 'name'
    | 'formatted'
    | 'internal';

export const StructureTypeName = 'structure';
