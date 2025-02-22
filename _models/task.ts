export class Task {
	id!: number;
	text!: string;
	start_date!: string;
	end_date!: string;
	type!: string;
	duration!: number;
	progress!: number;
	parent!: number;
	open!: boolean;
	avatar_owner!: string;
	full_name_owner!: string;
}

export class Link {
	id!: number;
	source!: number;
	target!: number;
	type!: string;
}
