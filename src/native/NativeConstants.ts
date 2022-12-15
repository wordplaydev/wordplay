import type Translations from "../nodes/Translations";

export const VALUE_SYMBOL = "◇";

export const LIST_TYPE_VAR_NAMES: Translations = {
    eng: "Kind",
    "😀": VALUE_SYMBOL
};

export const SET_TYPE_VAR_NAMES: Translations = {
    eng: "Kind",
    "😀": VALUE_SYMBOL
};

export const MAP_KEY_TYPE_VAR_NAMES: Translations = {
    eng: "Key",
    "😀": "🗝"
}

export const MAP_VALUE_TYPE_VAR_NAMES: Translations = {
    eng: "Value",
    "😀": VALUE_SYMBOL
}

export type NativeTypeName =
    "unparsable" |
    "unknown" |
    "any" |
    "never" |
    "none" |
    "exception" |
    "boolean" | 
    "measurement" |
    "unit" |
    "text" |
    "list" |
    "set" |
    "map" |
    "table" |
    "structure" |
    "column" |
    "stream" |
    "conversion" |
    "function" |
    "union" |
    "variable" |
    "name";