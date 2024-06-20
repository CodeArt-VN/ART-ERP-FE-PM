import { Routes } from '@angular/router';
import { AuthGuard } from 'src/app/guards/app.guard';

export const PMRoutes: Routes = [
    
    { path: 'gantt', loadChildren: () => import('./gantt/gantt.module').then(m => m.GanttPageModule) },
    { path: 'task', loadChildren: () => import('./task/task.module').then(m => m.TaskPageModule), canActivate: [AuthGuard] },

    { path: 'task-todo', loadChildren: () => import('./task-todo/task-todo.module').then(m => m.TaskTodoPageModule), canActivate: [AuthGuard] },
    { path: 'space', loadChildren: () => import('./space/space.module').then(m => m.SpacePageModule), canActivate: [AuthGuard] },
    { path: 'space/:id', loadChildren: () => import('./space-detail/space-detail.module').then(m => m.SpaceDetailPageModule), canActivate: [AuthGuard] },
    { path: 'space-status/:id', loadChildren: () => import('./space-status-modal/space-status-modal.module').then(m => m.SpaceStatusModalPageModule), canActivate: [AuthGuard] },
  
];
