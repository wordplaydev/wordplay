import VerseType from "../native/Verse";
import PhraseType from "../native/Phrase";
import GroupType from "../native/Group";
import Layout, { Vertical } from "../native/Layout";
import TransitionType, { Fade, Scale } from "../native/Transition";
import AnimationType, { Bounce, Throb, Wobble } from "../native/Animation";
import StyleType from "../native/Style";

const ImplicitShares = [
    VerseType,
    PhraseType,
    StyleType,
    GroupType,
    Vertical,
    Layout,
    TransitionType,
    Fade,
    Scale,
    AnimationType,
    Wobble,
    Throb,
    Bounce
];
export default ImplicitShares;