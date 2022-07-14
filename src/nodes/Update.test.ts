import { ExpectedUpdateBind, IncompatibleCellType, NotATable, testConflict, UnknownColumn } from "../parser/Conflict";
import Update from "./Update";

test("Test select conflicts", () => {

    testConflict('table: |one•#\ntable|:|one:1 one < 1', 'table: 1\ntable|:|one:1 one < 1', Update, NotATable);
    testConflict('table: |one•#\ntable|:|one:1 one < 1', 'table: |one•#\ntable|:|one one < 1', Update, ExpectedUpdateBind);
    testConflict('table: |one•#\ntable|:|one:1 one < 1', 'table: |one•#\ntable|:|two:1 one < 1', Update, UnknownColumn);
    testConflict('table: |one•#\ntable|:|one:1 one < 1', 'table: |one•#\ntable|:|one:"" one < 1', Update, IncompatibleCellType);
    
});