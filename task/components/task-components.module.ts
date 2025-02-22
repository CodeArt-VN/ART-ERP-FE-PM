import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { ShareModule } from 'src/app/share.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { GanttComponent } from './gantt/gantt.component';
import { BoardComponent } from './board/board.component';
import { DragDropModule, CdkDropListGroup, CdkDropList, CdkDrag } from '@angular/cdk/drag-drop';

@NgModule({
	imports: [IonicModule, CommonModule, ShareModule, FormsModule, ReactiveFormsModule, CdkDropListGroup, CdkDropList, CdkDrag, DragDropModule],
	declarations: [GanttComponent, BoardComponent],
	exports: [GanttComponent, BoardComponent],
})
export class TaskComponentsModule {}
