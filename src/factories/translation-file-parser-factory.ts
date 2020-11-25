import { PortableObjectParser } from "../parsers/po-parser";
import { TranslationFileKind } from "../translation-file-kind";
import { TranslationFileParser } from "../translation-file-parser";
import { RestextParser } from "../parsers/restext-parser";
import { ResxParser } from "../parsers/resx-parser";
import { XliffParser } from "../parsers/xliff-parser";

export const translationFileParserFactory = (translationFileKind: TranslationFileKind): TranslationFileParser => {
    switch (translationFileKind) {
        case 'resx': return new ResxParser();
        case 'xliff': return new XliffParser();
        case 'restext': return new RestextParser();
        case 'po': return new PortableObjectParser();

        default:
            throw new Error(`Unrecognized resource kind: ${translationFileKind}`);
    }
}