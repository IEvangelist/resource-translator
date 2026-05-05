import { RestextFile } from "../file-formats/restext-file";
import { TranslationFileParser } from "./translation-file-parser";
import { TranslatableTextMap } from "../abstractions/translatable-text-map";
import { delay } from "../helpers/utils";

const whiteSpace: RegExp = /\S/;

export class RestextParser implements TranslationFileParser {
  async parseFrom(fileContent: string): Promise<RestextFile> {
    await delay(0, null);

    const map: Map<number, string> = new Map();
    let restextFile = { map: new Map() };

    if (fileContent) {
      fileContent.split("\n").map((line, index) => {
        if (
          this.isComment(line) ||
          this.isSection(line) ||
          this.isWhitespace(line)
        ) {
          restextFile = {
            ...restextFile,
            [index]: line,
          };
        } else {
          // Split only on the FIRST '=' so values containing '=' (URLs with
          // query strings, base64, equation strings, ...) round-trip cleanly.
          // Lines without an '=' are stored verbatim so we can re-emit them
          // unchanged on output.
          const equalsAt = line.indexOf("=");
          if (equalsAt < 0) {
            restextFile = {
              ...restextFile,
              [index]: line,
            };
            return;
          }
          const key = line.slice(0, equalsAt);
          const val = line.slice(equalsAt + 1);
          map.set(index, key);
          restextFile = {
            ...restextFile,
            [key]: val,
          };
        }
      });
    }

    restextFile.map = map;
    return restextFile as RestextFile;
  }

  toFileFormatted(instance: RestextFile, defaultValue: string): string {
    const map = instance.map;
    const keys = Object.keys(instance);
    const length = map.size + keys.length - 1;
    let text = "";
    for (let index = 0; index < length; ++index) {
      const line = instance[index];
      const delimiter = index === 0 ? "" : "\n";
      if (
        this.isComment(line) ||
        this.isSection(line) ||
        this.isWhitespace(line)
      ) {
        text += `${delimiter}${line}`;
      } else if (map.has(index)) {
        const key = map.get(index)!;
        text += `${delimiter}${key}=${instance[key]}`;
      } else if (line !== undefined) {
        // Verbatim line that wasn't a recognizable comment/section/whitespace
        // and wasn't a key=value pair (e.g. a stray line without '='). We
        // preserve it untouched so round-trips are byte-stable.
        text += `${delimiter}${line}`;
      }
    }

    return text || defaultValue;
  }

  applyTranslations(
    instance: RestextFile,
    translations: { [key: string]: string } | undefined,
    _targetLocale?: string,
  ): RestextFile {
    if (instance && translations) {
      for (const key in translations) {
        const value = translations[key];
        if (value) {
          instance[key] = value;
        }
      }
    }

    return instance;
  }

  toTranslatableTextMap(instance: RestextFile): TranslatableTextMap {
    const textToTranslate: Map<string, string> = new Map();
    for (const [key, value] of Object.entries(instance)) {
      if (typeof key !== "number") {
        textToTranslate.set(key, value);
      }
    }

    return {
      text: textToTranslate,
    };
  }

  private isComment = (line: string) => {
    return !!line && line.startsWith(";");
  };

  private isSection = (line: string) => {
    return !!line && line.startsWith("[");
  };

  private isWhitespace = (line: string) => {
    return !whiteSpace.test(line);
  };
}
