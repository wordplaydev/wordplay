import { IncompatibleCellType, MissingColumns, NotATable, testConflict } from "../parser/Conflict";
import Insert from "./Insert";

test("Test insert conflicts", () => {

    testConflict('table: |one•#\ntable|+|1', 'table: 1\ntable|+|1', Insert, NotATable);
    testConflict('table: |one•#\ntable|+|1', 'table: |one•#\ntable|+', Insert, MissingColumns);
    testConflict('table: |one•#\ntable|+|1', 'table: |one•#\ntable|+|"hi"', Insert, IncompatibleCellType);

});