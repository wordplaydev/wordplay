import { testConflict } from "../conflicts/TestUtilities";
import { IncompatibleCellType } from "../conflicts/IncompatibleCellType";
import { NotATable } from "../conflicts/NotATable";
import Insert from "./Insert";
import { MissingCells } from "../conflicts/MissingCells";

test("Test insert conflicts", () => {

    testConflict('table: |one•#||\ntable|+|1||', 'table: 1\ntable|+|1||', Insert, NotATable);
    testConflict('table: |one•#||\ntable|+|1||', 'table: |one•#||\ntable|+||', Insert, MissingCells);
    testConflict('table: |one•#||\ntable|+|1||', 'table: |one•#||\ntable|+|"hi"||', Insert, IncompatibleCellType);

});