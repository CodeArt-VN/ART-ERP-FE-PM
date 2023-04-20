export class Task {
    id!: number;
    start_date!: string;
    text!: string;
    progress!: number;
    duration!: number;
    parent!: number;
}

export class Link {
    id!: number;
    source!: number;
    target!: number;
    type!: string;
}