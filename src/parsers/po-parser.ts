import { PortableObjectFile, PortableObjectToken } from "../files/po-file";
import { TranslationFileParser } from "../translation-file-parser";
import { TranslatableTextMap } from "../translatable-text-map";
import { delay, naturalLanguageCompare } from "../utils";

export class PortableObjectParser implements TranslationFileParser {
    async parseFrom(fileContent: string): Promise<PortableObjectFile> {
        await delay(1, null);
        let portableObjectFile: PortableObjectFile = {
            tokens: []
        };
        if (fileContent) {
            portableObjectFile.tokens =
                fileContent.split('\n').map(
                    line => new PortableObjectToken(line));
        }
        return portableObjectFile;
    }

    toFileFormatted(instance: PortableObjectFile, defaultValue: string): string {
        return !!instance ? instance.tokens.map(t => t.line).join('\n') : defaultValue;
    }

    applyTranslations(
        instance: PortableObjectFile,
        translations: { [key: string]: string; } | undefined,
        ordinals: number[] | undefined): PortableObjectFile {
        throw new Error("Method not implemented.");
    }

    toTranslatableTextMap(instance: PortableObjectFile): TranslatableTextMap {
        const textToTranslate: Map<string, string> = new Map();
        const tokens = instance.tokens;
        if (tokens && tokens.length) {
            const tryGetKeyValuePair = (batchedTokens: PortableObjectToken[]): { key: string, value: string } | undefined => {
                if (batchedTokens && batchedTokens.length) {
                    const key = batchedTokens.find(t => t.id === 'msgid')?.value;
                    const value = batchedTokens.find(t => t.id === 'msgstr')?.value;

                    return !!key && !!value ? { key, value } : undefined;
                }
                return undefined;
            };

            const values = [];
            let index = 0;
            let [lastIndex, batch] = this.batchTokens(tokens, index);
            while (batch && lastIndex !== tokens.length) {
                let pair = tryGetKeyValuePair(batch);
                if (pair) {
                    textToTranslate.set(pair.key, pair.value);
                }
                [lastIndex, batch] = this.batchTokens(tokens, lastIndex);
            }
        }

        const translatableText: Map<string, string> = new Map();
        [...textToTranslate.keys()].sort((a, b) => naturalLanguageCompare(a, b)).forEach(key => {
            translatableText.set(key, textToTranslate.get(key)!);
        });

        const ordinals: number[] =
            [...translatableText.keys()].map(
                key => tokens.findIndex(t => t.value === key));

        return {
            text: translatableText,
            ordinals
        };
    }

    private batchTokens(tokens: PortableObjectToken[], index: number): [number, PortableObjectToken[]] {
        let batch: PortableObjectToken[] = [];
        let lastIndex = index;
        for (lastIndex; lastIndex < tokens.length; ++lastIndex) {
            const token = tokens[lastIndex];
            if (!token.isInsignificant) {
                batch.push(token);
            }
        }

        return [lastIndex, batch];
    }
}