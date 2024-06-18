import { Component, ViewEncapsulation } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider, PM_TaskLinkProvider, PM_TaskProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';



@Component({
  encapsulation: ViewEncapsulation.None,
  selector: 'app-task',
  templateUrl: 'task.page.html',
  styleUrls: ['task.page.scss'],
})
export class TaskPage extends PageBase {

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
    //this.segmentView = this.route.snapshot?.paramMap?.get('segment');
    this.pageConfig.pageTitle = '1';
  }
  listSegmentView = [{
    Code:'board',
    Name:'Board'
  },
  {
    Code:'gantt',
    Name:'Gantt'
  },
  {
    Code:'list',
    Name:'List'
  }]
  taskList;
  selectedTask;

  preLoadData(event?: any): void {
    super.preLoadData(event);
    
  }
  segmentView = 'board';
  segmentChanged(ev: any) {
    this.segmentView = ev.detail.value;
  }
  selectTask(){
    
  }

  loadedData(event?: any, ignoredFromGroup?: boolean): void {
      super.loadedData(event);
      this.taskList = this.items;
  }
}
