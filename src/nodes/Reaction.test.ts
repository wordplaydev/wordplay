import { IncompatibleStreamValues, NotAStream, testConflict } from "../parser/Conflict";
import Reaction from "./Reaction";

test("Test stream conflicts", () => {

    // TODO Enable after implementing some streams.
    // testConflict('1 ∆ time 1', '1 ∆ tome ""', Stream, NotAStream);
    testConflict('1 ∆ time 1', '1 ∆ time ""', Reaction, IncompatibleStreamValues);
    
});