import Verse from "../native/Verse";
import Phrase from "../native/Phrase";
import Group from "../native/Group";
import Layout, { Vertical } from "../native/Layout";
import Transition, { Fade, Scale } from "../native/Transition";
import Animation, { Bounce, Throb, Wobble } from "../native/Animation";
import Style from "../native/Style";

const ImplicitShares = [
    Verse,
    Phrase,
    Style,
    Group,
    Vertical,
    Layout,
    Transition,
    Fade,
    Scale,
    Animation,
    Wobble,
    Throb,
    Bounce
];
export default ImplicitShares;