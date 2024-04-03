export class Task {
  id!: number;
  text!: string;
  start_date!: string;
  type!: string;
  duration!: number;
  progress!: number;
  parent!: number;
  open!: boolean;
}

export class Link {
  id!: number;
  source!: number;
  target!: number;
  type!: string;
}
