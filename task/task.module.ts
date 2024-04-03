import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskPage } from './task.page';
import { ShareModule } from 'src/app/share.module';
import { TaskModalPage } from '../task-modal/task-modal.page';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ShareModule,
    RouterModule.forChild([{ path: '', component: TaskPage }]),
  ],
  declarations: [TaskPage, TaskModalPage],
})
export class TaskPageModule {}
