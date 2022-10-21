import { test } from "vitest";
import { testConflict } from "../conflicts/TestUtilities";
import IncompatibleCellType from "../conflicts/IncompatibleCellType";
import NotATable from "../conflicts/NotATable";
import Insert from "./Insert";
import MissingCell from "../conflicts/MissingCell";
import InvalidRow from "../conflicts/InvalidRow";

test("Test insert conflicts", () => {

    testConflict('table: |one•#||\ntable|+|1||', 'table: 1\ntable|+|1||', Insert, NotATable);
    testConflict('table: |one•#||\ntable|+|1||', 'table: |one•#||\ntable|+||', Insert, MissingCell);
    testConflict('table: |one•#||\ntable|+|1||', 'table: |one•#||\ntable|+|"hi"||', Insert, IncompatibleCellType);
    testConflict('table: |one•#||\ntable|+|1|1||', 'table: |one•#||\ntable|+|1|one:1||', Insert, InvalidRow);

});