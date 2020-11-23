import { PortableObjectFile } from "./po-file";
import { ResourceFile } from "./resource-file";
import { RestextFile } from "./restext-file";
import { XliffFile } from "./xliff-file";

export type TranslationFile =
    PortableObjectFile |
    ResourceFile |
    RestextFile |
    XliffFile;