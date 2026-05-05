import { TranslatableTextMap } from "../abstractions/translatable-text-map";
import { JsonFile } from "../file-formats/json-file";
import { TranslationFileParser } from "./translation-file-parser";
import { warning } from "@actions/core";

export class JsonParser implements TranslationFileParser {
  static DELIMITER: string = "[--]";

  parseFrom(fileContent: string): Promise<JsonFile> {
    const map = new Map<string, unknown>();

    let containsTranslatableArray = false;

    // Walk plain objects only. Arrays, null, numbers, booleans are stored
    // verbatim at the parent path so:
    //   1. Non-string values don't crash the parser (Object.entries(null)
    //      throws "Cannot convert undefined or null to object").
    //   2. Round-trips preserve the original document byte-for-byte even for
    //      mixed-type i18n files (a documented but supported pattern).
    const buildMap = (obj: unknown, parentPath?: string) => {
      if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
        if (parentPath !== undefined) {
          map.set(parentPath, obj);
        }
        if (
          Array.isArray(obj) &&
          (obj as unknown[]).some((item) => typeof item === "string")
        ) {
          containsTranslatableArray = true;
        }
        return;
      }
      for (const [key, value] of Object.entries(
        obj as Record<string, unknown>,
      )) {
        const path = parentPath
          ? `${parentPath}${JsonParser.DELIMITER}${key}`
          : key;
        if (typeof value === "string") {
          map.set(path, value);
        } else if (
          value !== null &&
          typeof value === "object" &&
          !Array.isArray(value)
        ) {
          buildMap(value, path);
        } else {
          // null, number, boolean, array — keep verbatim, skip translation.
          map.set(path, value);
          if (
            Array.isArray(value) &&
            (value as unknown[]).some((item) => typeof item === "string")
          ) {
            containsTranslatableArray = true;
          }
        }
      }
    };

    try {
      const content = JSON.parse(fileContent);
      if (
        content === null ||
        typeof content !== "object" ||
        Array.isArray(content)
      ) {
        throw new Error(
          "Top-level JSON must be an object (got " +
            (Array.isArray(content) ? "array" : typeof content) +
            ").",
        );
      }
      buildMap(content);
    } catch (e) {
      throw new Error(
        `Failed to parse json. Error: ${e}. Content: ${fileContent}`,
        { cause: e },
      );
    }

    if (containsTranslatableArray) {
      // Arrays that contain string elements (plural forms, select-tag
      // options, ...) are intentionally left UNTRANSLATED to preserve
      // round-trip safety. Surface that as a warning so users with
      // array-shaped i18n payloads aren't silently shipping English in
      // their localized output. See
      // https://github.com/IEvangelist/resource-translator/issues for
      // tracking the proper fix.
      warning(
        "JsonParser: encountered an array containing strings — array values are preserved verbatim and NOT translated. Restructure into nested objects to translate them.",
      );
    }

    return Promise.resolve(Object.fromEntries(map) as JsonFile);
  }

  toFileFormatted(instance: JsonFile, _defaultValue: string): string {
    const content: Record<string, unknown> = {};

    const buildObject = (
      obj: Record<string, unknown>,
      keyParts: string[],
      value: unknown,
    ) => {
      const keyPart = keyParts[0];
      const isLastChild = keyParts.length === 1;
      if (isLastChild) {
        obj[keyPart] = value;
        return;
      }
      if (
        obj[keyPart] === undefined ||
        obj[keyPart] === null ||
        typeof obj[keyPart] !== "object" ||
        Array.isArray(obj[keyPart])
      ) {
        obj[keyPart] = {};
      }
      buildObject(
        obj[keyPart] as Record<string, unknown>,
        keyParts.slice(1),
        value,
      );
    };

    for (const [key, value] of Object.entries(instance)) {
      const keyParts = key.split(JsonParser.DELIMITER);
      buildObject(content, keyParts, value);
    }

    return JSON.stringify(content, null, "\t");
  }

  applyTranslations(
    instance: JsonFile,
    translations: { [key: string]: string } | undefined,
    _targetLocale?: string,
  ): JsonFile {
    if (instance && translations) {
      for (const key in translations) {
        const value = translations[key];
        // Only overwrite when there's a non-empty translation AND the key
        // already maps to a string value in the source. We never replace a
        // non-string value (e.g. a preserved number/boolean/array) with a
        // string from Azure.
        if (value && typeof instance[key] === "string") {
          instance[key] = value;
        }
      }
    }

    return instance;
  }

  toTranslatableTextMap(instance: JsonFile): TranslatableTextMap {
    const textToTranslate: Map<string, string> = new Map();
    for (const [key, value] of Object.entries(instance)) {
      if (typeof value === "string") {
        textToTranslate.set(key, value);
      }
    }

    return {
      text: textToTranslate,
    };
  }
}
