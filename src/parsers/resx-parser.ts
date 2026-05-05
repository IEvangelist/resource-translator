import {
  Data,
  ResourceFile,
  isTranslatable,
  traverseResx,
} from "../file-formats/resource-file";
import { TranslationFileParser } from "./translation-file-parser";
import { XmlFileParser } from "./xml-file-parser";

export class ResxParser implements TranslationFileParser {
  async parseFrom(fileContent: string): Promise<ResourceFile> {
    return await XmlFileParser.fromXml<ResourceFile>(fileContent);
  }

  toFileFormatted(instance: ResourceFile, defaultValue: string): string {
    try {
      return XmlFileParser.toXml(instance);
    } catch {
      return defaultValue;
    }
  }

  applyTranslations(
    resource: ResourceFile,
    translations: { [key: string]: string } | undefined,
    _targetLocale?: string,
  ) {
    if (resource && translations) {
      for (const key in translations) {
        const value = translations[key];
        if (value) {
          // traverseResx already filters out file-ref / binary entries, so
          // we never overwrite the value of a `<data type="...">` or
          // `<data mimetype="...">` even if a stray translation key matched.
          traverseResx(resource, key, (data: Data) => (data.value = [value]));
        }
      }
    }

    return resource;
  }

  toTranslatableTextMap(instance: ResourceFile) {
    const textToTranslate: Map<string, string> = new Map();
    const values = instance.root.data;
    if (values && values.length) {
      for (let i = 0; i < values.length; ++i) {
        // Skip file references (`type` attribute) and binary blobs
        // (`mimetype` attribute) — their `<value>` payload is not natural
        // language and must NOT be sent to Azure.
        if (!isTranslatable(values[i])) {
          continue;
        }
        const key = values[i].$.name;
        const value = values[i].value![0];

        textToTranslate.set(key, value);
      }
    }

    return {
      text: textToTranslate,
    };
  }
}
