import { Injectable } from '@angular/core';
import { Link, Task } from '../_models/task';

@Injectable({ providedIn: 'root' })
export class TaskService {
    get(): Promise<Task[]>{
        return Promise.resolve([
            { id: 1, text: 'Task #1', start_date: '2023-04-15 00:00', duration: 3, progress: 0.6, parent: 0 },
            { id: 2, text: 'Task #2', start_date: '2023-04-18 00:00', duration: 3, progress: 0.4, parent: 0 }
        ]);
    }
}

@Injectable({ providedIn: 'root' })
export class LinkService {
    get(): Promise<Link[]> {
        return Promise.resolve([
            { id: 1, source: 1, target: 2, type: '0' }
        ]);
    }
}