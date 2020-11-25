export interface PortableObjectFile {
    tokens: PortableObjectToken[];
}

const firstWhitespace: RegExp = /\s+(.*)/;

// https://www.yogihosting.com/portable-object-aspnet-core/

export class PortableObjectToken {
    private _isInsignificant: boolean;
    private _identifier: string | null = null;
    private _value: string | null = null;

    get id(): string | null {
        return this._identifier;
    }

    get value(): string | null {
        return this._value;
    }

    get isInsignificant(): boolean {
        return this._isInsignificant;
    }

    get isCommentLine(): boolean {
        return !!this.line && this.line.startsWith('#:');
    }

    constructor(public line: string | null | undefined) {
        if (line && line.trim()) {
            const keyValuePair = line.split(firstWhitespace);
            this._identifier = keyValuePair[0];
            this._value = keyValuePair[1];
            this._isInsignificant = false;
        } else {
            this._isInsignificant = true;
        }
    }
}

export type PortableObjectTokenIdentifier =
    'msgid' |
    'msgid_plural' |
    'msgstr';