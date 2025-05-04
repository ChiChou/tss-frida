import type * as ts from "typescript/lib/tsserverlibrary";
import { FridaScriptPlugin } from "./plugin";

export = (mod: { typescript: typeof ts }) =>
    new FridaScriptPlugin(mod.typescript);
