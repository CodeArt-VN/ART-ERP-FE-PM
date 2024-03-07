import { Routes } from '@angular/router';
import { AuthGuard } from 'src/app/guards/app.guard';

export const PMRoutes: Routes = [
    
    { path: 'gantt', loadChildren: () => import('./gantt/gantt.module').then(m => m.GanttPageModule) },

];
