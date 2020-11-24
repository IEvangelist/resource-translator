export interface XliffFile {
    xliff: Xliff;
}

export interface Xliff {
    file: File[];
}

export interface File {
    $: IdAttribute;
    unit: Unit[];
}

export interface IdAttribute {
    id: number;
}

export interface Unit {
    segment: Segment[];
}

export interface Segment {
    source: string;
    target: string;
}