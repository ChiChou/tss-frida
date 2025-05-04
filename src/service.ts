import * as ts from "typescript/lib/tsserverlibrary";
import { ICustomizedLanguageServie } from "./decorator";
import { LanguageServiceLogger } from "./logger";

import "../typescript-private"

function tokensToCompletions(tokenList?: string): ts.CompletionEntry[] {
  if (!tokenList) return [];

  return tokenList.split(',').map((token) => ({
    name: token,
    kind: ts.ScriptElementKind.variableElement,
    kindModifiers: ts.ScriptElementKindModifier.ambientModifier,
    sortText: '0'
  }));
}

// todo: dynamically load from ipc
const state = {
  classes: tokensToCompletions("NSObject,NSArray,NSDictionary"),
  protocols: tokensToCompletions("NSXPCListenerDelegate,NSURLSessionDelegate"),
};

function isFridaGum(info: ts.DefinitionInfo) {
  return info.fileName.endsWith("/node_modules/@types/frida-gum/index.d.ts");
}

export class CustomizedLanguageService implements ICustomizedLanguageServie {
  constructor(
    private readonly info: ts.server.PluginCreateInfo,
    private readonly typescript: typeof ts,
    private readonly logger: LanguageServiceLogger
  ) {
    this.logger.log(`loaded in ts ${this.typescript.version}`);
  }

  getCompletionsAtPosition(fileName: string, position: number, options: ts.GetCompletionsAtPositionOptions) {
    const prior = this.info.languageService.getCompletionsAtPosition(fileName, position, options);
    if (!prior) return;

    if (position > 1 && prior.entries.length === 0 && !prior.isGlobalCompletion && prior.isMemberCompletion) {
      const typeDef = this.info.languageService.getTypeDefinitionAtPosition(fileName, position - 1);
      if (typeDef && typeDef.length === 1) {
        const first = typeDef[0];
        if (isFridaGum(first)) {
          if (first.name === 'classes') {
            prior.entries = state.classes;
          } else if (first.name === 'protocols') {
            prior.entries = state.protocols;
          }
        }
      }
    }

    return prior;
  }
}
