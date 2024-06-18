import { filter } from 'rxjs';
import { Component, ElementRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider, PM_TaskLinkProvider, PM_TaskProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import {
  CdkDragDrop,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';


@Component({
  encapsulation: ViewEncapsulation.None,
  selector: 'app-board',
  templateUrl: 'board.component.html',
  styleUrls: ['board.component.scss'],
})
export class BoardComponent extends PageBase {

  groupBy = {
    level1: {
      property : 'Status',
      order : 'desc',
      list: [
        { Id: 1, Code: 'todo', Name: 'Todo', Type: 'Active', Icon: '', Color: '', Remark: '1' },
        { Id: 1, Code: 'review', Name: 'Review', Type: 'Active', Icon: '', Color: '', Remark: '2' },
        { Id: 1, Code: 'coding', Name: 'Coding', Type: 'Active', Icon: '', Color: '', Remark: '1' },
        { Id: 1, Code: 'testing', Name: 'Testing', Type: 'Active', Icon: '', Color: '', Remark: '2' },
        { Id: 1, Code: 'done', Name: 'Done', Type: 'Active', Icon: '', Color: '', Remark: '1' },
        
      ]
    },
    level2: {
      property : 'Priority',
      order : 'desc',
      list: [
        { Id: 1, Code: '5', Name: 'HighPriorityUrgent', Type: 'Active', Icon: '', Color: '', Remark: '1' },
        { Id: 1, Code: '1', Name: 'No', Type: 'Active', Icon: '', Color: '', Remark: '1' },
        { Id: 1, Code: '2', Name: 'NotPriorityNotUrgent', Type: 'Active', Icon: '', Color: '', Remark: '2' },
        { Id: 1, Code: '3', Name: 'LowPriorityUrgent', Type: 'Active', Icon: '', Color: '', Remark: '1' },
        { Id: 1, Code: '4', Name: 'MediumPriorityNotUrgent', Type: 'Active', Icon: '', Color: '', Remark: '2' },
      ]
    }
  }
  priorities: string[] = [...new Set(this.groupBy.level2.list.map(task => task.Code))]

  constructor(
    public pageProvider: PM_TaskProvider,
    public taskLinkService: PM_TaskLinkProvider,
    public branchProvider: BRA_BranchProvider,
    public modalController: ModalController,
    public popoverCtrl: PopoverController,
    public alertCtrl: AlertController,
    public loadingController: LoadingController,
    public env: EnvService,
    public navCtrl: NavController,
    public location: Location,
  ) {
    super();

  }


  
  getTask(statusCode: string = null, priorityCode: string = null) {
    
      if(statusCode == null && priorityCode == null) return this.tasks;
      return this.tasks.filter(task =>
        {
          const status = statusCode == null || task.Status == statusCode;
          const priority = priorityCode == null || task.Priority.toString() == priorityCode;
          return status && priority;
        });
  }
 

  tasks = [
    { Id: 1, Name: 'todo5 Get to work', Status: 'todo', Priority: 5 },
    { Id: 2, Name: 'todo5 Pick up groceries', Status: 'todo', Priority: 5 },
    { Id: 3, Name: 'todo5 Go home', Status: 'todo', Priority: 5},
    { Id: 4, Name: 'coding5 Fall asleep', Status: 'coding', Priority: 5 },
    { Id: 5, Name: 'done4 Get up', Status: 'done', Priority: 4 },
    { Id: 6, Name: 'testing4 Brush teeth', Status: 'testing', Priority: 4 },
    { Id: 7, Name: 'testing2 Take a shower', Status: 'testing', Priority: 2 },
    { Id: 8, Name: 'review1 Check e-mail', Status: 'review', Priority: 1 },
    { Id: 9, Name: 'done1 Walk dog', Status: 'done', Priority: 1 }
  ];



  drop(event: CdkDragDrop<any[]>, statusCode: string = null, priorityCode: string = null) {
    if (event.previousContainer === event.container) {
      moveItemInArray(
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
      const movedTask = event.container.data[event.currentIndex];

      if (statusCode) {
        movedTask.Status = statusCode;
      }
      if (priorityCode) {
        movedTask.Priority = parseInt(priorityCode);
      }
    }
  }
  preLoadData(event?: any): void {
    super.preLoadData(event);
  }
  isGroupByPopoverOpen = false;
  @ViewChild('groupByPopover') groupByPopover;
  presentGroupByPopover(e: Event) {
    this.groupByPopover.event = e;
    this.isGroupByPopoverOpen = true;
  }



  async saveChange() {
    return super.saveChange2();
  }
}
