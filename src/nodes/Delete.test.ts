import { NonBooleanQuery, NotATable, testConflict } from "../parser/Conflict";
import Delete from "./Delete";

test("Test delete conflicts", () => {

    testConflict('table: |one•#\ntable|- 1 < 2', 'table: 1\ntable|- 1 < 2', Delete, NotATable);
    testConflict('table: |one•#\ntable|- 1 < 2', 'table: 1\ntable|- 1 + 2', Delete, NonBooleanQuery);

});