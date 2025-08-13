import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TaskPage } from './task.page';
import { ShareModule } from 'src/app/share.module';
import { TaskModalPage } from '../task-modal/task-modal.page';
import { TaskComponentsModule } from './components/task-components.module';
import { ListComponent } from './components/list/list.component';

@NgModule({
	imports: [IonicModule, CommonModule, FormsModule, ShareModule, ReactiveFormsModule, TaskComponentsModule, RouterModule.forChild([{ path: '', component: TaskPage }])],
	declarations: [TaskPage, TaskModalPage, ListComponent],
})
export class TaskPageModule {}
