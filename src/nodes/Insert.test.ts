import { testConflict } from "../conflicts/testConflict";
import { IncompatibleCellType } from "../conflicts/IncompatibleCellType";
import { MissingColumns } from "../conflicts/MissingColumns";
import { NotATable } from "../conflicts/NotATable";
import Insert from "./Insert";

test("Test insert conflicts", () => {

    testConflict('table: |one•#\ntable|+|1', 'table: 1\ntable|+|1', Insert, NotATable);
    testConflict('table: |one•#\ntable|+|1', 'table: |one•#\ntable|+', Insert, MissingColumns);
    testConflict('table: |one•#\ntable|+|1', 'table: |one•#\ntable|+|"hi"', Insert, IncompatibleCellType);

});