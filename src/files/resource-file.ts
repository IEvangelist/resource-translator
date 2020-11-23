export interface ResourceFile {
    root: Root;
}

export interface Root {
    data: Data[];
}

export interface Data {
    $: NameAttribute;
    value: string[];
}

export interface NameAttribute {
    name: string;
}