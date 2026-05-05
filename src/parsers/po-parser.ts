import {
  PortableObjectFile,
  PortableObjectToken,
} from "../file-formats/po-file";
import { TranslationFileParser } from "./translation-file-parser";
import { TranslatableTextMap } from "../abstractions/translatable-text-map";
import { delay, findNext } from "../helpers/utils";
import { warning } from "@actions/core";

export class PortableObjectParser implements TranslationFileParser {
  async parseFrom(fileContent: string): Promise<PortableObjectFile> {
    await delay(0, null);
    const portableObjectFile: PortableObjectFile = {
      tokens: [],
    };
    if (fileContent) {
      portableObjectFile.tokens = fileContent
        .split("\n")
        .map((line) => new PortableObjectToken(line));
    }
    return portableObjectFile;
  }

  toFileFormatted(instance: PortableObjectFile, defaultValue: string): string {
    return instance
      ? instance.tokens.map((t) => t.line).join("\n")
      : defaultValue;
  }

  applyTranslations(
    portableObject: PortableObjectFile,
    translations: { [key: string]: string } | undefined,
    _targetLocale?: string,
  ): PortableObjectFile {
    if (portableObject && translations) {
      // Pre-compute which msgids are part of a multi-line entry so the
      // walker refuses to write a translation into the leading `msgstr`
      // line while leaving stale continuation lines intact.
      const skipMsgids = this.getMultilineMsgids(portableObject.tokens);

      let lastIndex = 0;
      for (const key in translations) {
        if (skipMsgids.has(key)) continue;
        const value = translations[key];
        if (value) {
          lastIndex = findNext(
            portableObject.tokens,
            lastIndex,
            (token) => {
              let foundFirst = false;
              let secondOffset = 0;
              if (!token.isInsignificant && !token.isContinuation) {
                if (token.value === key) {
                  foundFirst = true;
                  secondOffset = token.id === "msgid" ? 0 : 1;
                }
              }
              return [foundFirst, secondOffset];
            },
            (token, secondOffset) => {
              let foundSecond = false;
              if (!token.isInsignificant && !token.isContinuation) {
                foundSecond = secondOffset
                  ? token.id!.startsWith(`msgstr[${secondOffset}]`)
                  : token.id!.startsWith("msgstr");
              }
              return foundSecond;
            },
            (token) => (token.value = value),
          );
        }
      }
    }

    return portableObject;
  }

  toTranslatableTextMap(instance: PortableObjectFile): TranslatableTextMap {
    const textToTranslate: Map<string, string> = new Map();
    const tokens = instance.tokens;
    if (tokens && tokens.length) {
      // Multi-line PO entries (continuations on the msgid OR the msgstr
      // side) cannot be safely round-tripped by the current parser, so we
      // exclude them from the translatable map and emit a single warning.
      // Doing nothing is preferable to producing a half-translated /
      // half-original output file.
      const skipMsgids = this.getMultilineMsgids(tokens);
      let warnedMultiline = false;

      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (
          token.isCommentLine ||
          token.isInsignificant ||
          token.isContinuation
        ) {
          continue;
        }

        if (token.id === "msgid" || token.id === "msgid_plural") {
          if (token.value && skipMsgids.has(token.value)) {
            if (!warnedMultiline) {
              warning(
                "PortableObjectParser: multi-line PO continuations (in msgid or msgstr) are not yet supported and will be left unchanged. See https://github.com/IEvangelist/resource-translator/issues for status.",
              );
              warnedMultiline = true;
            }
            continue;
          }

          if (token.value) {
            textToTranslate.set(token.value, token.value);
          }
        }
      }
    }

    return {
      text: textToTranslate,
    };
  }

  /**
   * Returns the set of `msgid` (and `msgid_plural`) values whose entry uses
   * PO continuation syntax on EITHER the source (`msgid ""` + `"..."`) or
   * the target (`msgstr ""` + `"..."`) side.
   *
   * Both halves matter:
   *  - A multi-line `msgid` cannot be coalesced safely back into the file
   *    on round-trip.
   *  - A single-line `msgid` paired with a multi-line `msgstr` is even
   *    worse: `applyTranslations` would rewrite the first `msgstr` line
   *    and leave the dangling `"old "` / `"value"` continuation lines
   *    intact — silently producing a half-translated, half-original mess.
   *
   * A single PO entry consists of:
   *   msgid "..."        ← entry anchor
   *   [msgid_plural "..."]
   *   msgstr "..." | msgstr[0..N] "..."
   * — all of which can carry continuations. The next `msgid` starts a new
   * entry. We anchor scanning on `msgid` and treat `msgid_plural` /
   * `msgstr*` as members of the current entry, so a continuation on ANY
   * of them taints BOTH the singular and plural keys for that entry.
   *
   * Until proper coalescing lands we conservatively skip every member of
   * any tainted entry.
   */
  private getMultilineMsgids(tokens: PortableObjectToken[]): Set<string> {
    const multiline = new Set<string>();
    const isEmptyQuoted = (value: string | null): boolean =>
      value === '""' || value === null;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.id !== "msgid") continue;
      const msgidValue = token.value;
      if (!msgidValue) continue;

      const entryKeys: string[] = [msgidValue];
      let isMultiline =
        isEmptyQuoted(msgidValue) && !!tokens[i + 1]?.isContinuation;

      // Walk through every token that belongs to this entry — stop on the
      // next `msgid` (= next entry). `msgid_plural` and any `msgstr*`
      // are members of the CURRENT entry.
      for (let j = i + 1; j < tokens.length; j++) {
        const next = tokens[j];
        if (next.id === "msgid") break;

        if (next.id === "msgid_plural" && next.value) {
          entryKeys.push(next.value);
          if (isEmptyQuoted(next.value) && tokens[j + 1]?.isContinuation) {
            isMultiline = true;
          }
        } else if (
          next.id?.startsWith("msgstr") &&
          isEmptyQuoted(next.value) &&
          tokens[j + 1]?.isContinuation
        ) {
          isMultiline = true;
        }
      }

      if (isMultiline) {
        for (const key of entryKeys) multiline.add(key);
      }
    }
    return multiline;
  }
}
