import { Component, ViewEncapsulation } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import {
  BRA_BranchProvider,
  PM_SpaceProvider,
  PM_TaskLinkProvider,
  PM_TaskProvider,
} from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { TaskModalPage } from '../task-modal/task-modal.page';

import { environment } from 'src/environments/environment';
import { lib } from 'src/app/services/static/global-functions';

@Component({
  encapsulation: ViewEncapsulation.None,
  selector: 'app-task',
  templateUrl: 'task.page.html',
  styleUrls: ['task.page.scss'],
})
export class TaskPage extends PageBase {
  listParent;
  linksData;
  spaceList;
  constructor(
    public pageProvider: PM_TaskProvider,
    public spaceProvider: PM_SpaceProvider,
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
    this.query.AllChildren = true;
    this.query.AllParent = true;
  }
  listSegmentView = [
    {
      Code: 'board',
      Name: 'Board',
    },
    {
      Code: 'gantt',
      Name: 'Gantt',
    },
    {
      Code: 'list',
      Name: 'List',
    },
  ];
  taskList;
  selectedTask;

  preLoadData(event?: any): void {
    this.pageConfig.pageTitle = '';
    this.query.IDBranch = this.env.selectedBranch;
    this.spaceProvider.read().then((rs: any) => {
      this.spaceList = rs.data;
    });
    super.preLoadData(event);
    this.selectedTask = null;
  }
  refresh(event = null) {
    super.refresh(event);
    this.selectedTask = null;
  }
  segmentView = 'gantt';
  segmentChanged(ev: any) {
    this.segmentView = ev.detail.value;
  }

  selectTask(event) {
    if (this.selectedTask) {
      let idTask = this.selectedTask;
      this.submitAttempt = true;
      this.loadingController
        .create({
          cssClass: 'my-custom-class',
          message: 'Đang tải dữ liệu...',
        })
        .then((loading) => {
          loading.present();
          let query = lib.cloneObject(this.query);
          query.IDTask = idTask;
          if (!event.Type) {
            query.IDSpace = event.IDSpace;
          }

          this.pageProvider
            .read(query, this.pageConfig.forceLoadData)
            .then((resp: any) => {
              let selected = resp.data.find((d) => d.Id == idTask);
              if (selected) selected.IDParent = null;
              this.items = resp.data;
              let tasks = resp.data;
              if (tasks.length == 0) {
                this.pageConfig.isEndOfData = true;
              }
              if (tasks.length > 0) {
                let firstRow = tasks[0];
                //Fix dupplicate rows
                if (this.items.findIndex((d) => d.Id == firstRow.Id) == -1) {
                  this.items = [...this.items, ...tasks];
                }
              }

              this.items.forEach((p) => {
                p.AvatarOwner = '';
                if (p._Staff?.Code) {
                  p.AvatarOwner = environment.staffAvatarsServer + p._Staff.Code + '.jpg';
                }
              });
              let listParent: any[] = this.items.map((task: any) => {
                return {
                  Id: task.Id,
                  Name: task.Name,
                };
              });
              this.listParent = listParent;
              this.loadedData();
              this.submitAttempt = false;
              if (loading) loading.dismiss();
              this.pageConfig.isSubActive = true;
            })
            .catch((err) => {
              if (err.message != null) {
                this.env.showMessage(err.message, 'danger');
              } else {
                this.env.showTranslateMessage('Cannot loading data', 'danger');
              }
              this.submitAttempt = false;
              if (loading) loading.dismiss();
              this.pageConfig.isSubActive = true;
            });
        });
    } else {
      this.loadingController
        .create({
          cssClass: 'my-custom-class',
          message: 'Đang tải dữ liệu...',
        })
        .then((loading) => {
          loading.present();
          let queryTask: any = {
            Keyword: '',
            Take: 100,
            Skip: 0,
            AllChildren: true,
            AllParent: true,
            IDBranch: this.env.selectedBranch,
          };

          let queryLink: any = {
            Keyword: '',
            Take: 100,
            Skip: 0,
          };
          let promiseTask = this.pageProvider.read(queryTask, this.pageConfig.forceLoadData);
          let promiseLink = this.taskLinkService.read(queryLink, this.pageConfig.forceLoadData);
          Promise.all([promiseTask, promiseLink])
            .then((result: any) => {
              this.items = [];
              let tasks = result[0].data;
              if (tasks.length == 0) {
                this.pageConfig.isEndOfData = true;
              }
              if (tasks.length > 0) {
                let firstRow = tasks[0];

                //Fix dupplicate rows
                if (this.items.findIndex((d) => d.Id == firstRow.Id) == -1) {
                  this.items = [...this.items, ...tasks];
                }
              }

              this.items.forEach((p) => {
                p.AvatarOwner = '';
                if (p._Staff?.Code) {
                  p.AvatarOwner = environment.staffAvatarsServer + p._Staff.Code + '.jpg';
                }
              });
              let listParent: any[] = this.items.map((task: any) => {
                return {
                  Id: task.Id,
                  Name: task.Name,
                };
              });
              this.listParent = listParent;
              this.linksData = result[1].data;
              this.loadedData();
              this.submitAttempt = false;
              if (loading) loading.dismiss();
              this.pageConfig.isSubActive = true;
            })
            .catch((err) => {
              if (err.message != null) {
                this.env.showMessage(err.message, 'danger');
              } else {
                this.env.showTranslateMessage('Cannot extract data', 'danger');
              }

              this.loadedData();
              this.submitAttempt = false;
              if (loading) loading.dismiss();
              this.pageConfig.isSubActive = true;
            });
        });
    }
  }

  loadData(event = null) {
    this.parseSort();

    if (this.pageProvider) {
      if (event == 'search') {
        this.pageProvider.read(this.query, this.pageConfig.forceLoadData).then((result: any) => {
          if (result.data.length == 0) {
            this.pageConfig.isEndOfData = true;
          }
          this.items = result.data;
          this.loadedData(null);
        });
      } else {
        let queryTask: any = {
          Keyword: '',
          Take: 100,
          Skip: 0,
          AllChildren: true,
          AllParent: true,
          IDBranch: this.env.selectedBranch,
          RemoveTaskType: ['Task', 'Milestone', 'Todo'],
        };

        let queryLink: any = {
          Keyword: '',
          Take: 100,
          Skip: 0,
        };
        let promiseTask = this.pageProvider.read(queryTask, this.pageConfig.forceLoadData);
        let promiseLink = this.taskLinkService.read(queryLink, this.pageConfig.forceLoadData);
        Promise.all([promiseTask, promiseLink])
          .then((result: any) => {
            let tasks = result[0].data;
            if (tasks.length == 0) {
              this.pageConfig.isEndOfData = true;
            }
            if (tasks.length > 0) {
              let firstRow = tasks[0];

              //Fix dupplicate rows
              if (this.items.findIndex((d) => d.Id == firstRow.Id) == -1) {
                this.items = [...this.items, ...tasks];
              }
            }

            //let taskTree = [...this.items.filter((d) => d.Type != 'task' && d.Type != 'milestone')];

            let taskTree = [...this.items];

            this.spaceList.forEach((s) => {
              let taskTreeFilter = taskTree.filter((f) => (f.IDParent == null || f.IDParent == 0) && f.IDSpace == s.Id);
              if (taskTreeFilter.length > 0) {
                let idParent = lib.generateUID();
                taskTreeFilter.forEach((i) => {
                  i.IDParent = idParent;
                });

                let task = {
                  Id: idParent,
                  Name: s.Name,
                  IdParent: null,
                  IDSpace: s.Id,
                };
                taskTree.push(task);
              }
            });
            lib.buildFlatTree(taskTree, this.taskList).then((result: any) => {
              this.taskList = result;
            });
            this.items.forEach((p) => {
              p.AvatarOwner = '';
              if (p._Staff?.Code) {
                p.AvatarOwner = environment.staffAvatarsServer + p._Staff.Code + '.jpg';
              }
            });
            let listParent: any[] = this.items.map((task: any) => {
              return {
                Id: task.Id,
                Name: task.Name,
              };
            });
            this.listParent = listParent;
            this.linksData = result[1].data;
            this.loadedData(event);
          })
          .catch((err) => {
            if (err.message != null) {
              this.env.showMessage(err.message, 'danger');
            } else {
              this.env.showTranslateMessage('Cannot extract data', 'danger');
            }

            this.loadedData(event);
          });
      }
    } else {
      this.loadedData(event);
    }
  }

  add() {
    const task: any = {};
    task.Id = 0;
    task.Name = 'New task';
    task.Duration = 1;
    task.DurationPlan = 1;
    const startDate = new Date();
    const utcStartDate = new Date(startDate.getTime() - startDate.getTimezoneOffset() * 60000);
    task.StartDate = utcStartDate.toISOString().slice(0, 19);
    task.StartDatePlan = task.StartDate;
    const endDate = new Date(utcStartDate.getTime() + 24 * 60 * 60 * 1000);
    task.EndDate = endDate.toISOString().slice(0, 19);
    task.EndDatePlan = task.EndDate;
    this.openModalForNewTask(task, this.listParent);
  }

  async openModalForNewTask(task, listParent) {
    const modal = await this.modalController.create({
      component: TaskModalPage,
      componentProps: {
        task: task,
        listParent: listParent,
      },
      cssClass: 'modal90',
    });

    await modal.present();
    const {} = await modal.onWillDismiss();
    this.loadedData();
  }

  autoCalculateLink() {
    this.env.publishEvent({ Code: 'app:autoCalculateLink' });
  }
}
