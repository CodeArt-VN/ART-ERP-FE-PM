import { Component, ElementRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider, PM_TaskLinkProvider, PM_TaskProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { gantt } from 'dhtmlx-gantt';
import { Link, Task } from '../_models/task';
import { TaskModalPage } from '../task-modal/task-modal.page';

@Component({
  encapsulation: ViewEncapsulation.None,
  selector: 'app-task',
  templateUrl: 'task.page.html',
  styleUrls: ['task.page.scss'],
})
export class TaskPage extends PageBase {
  @ViewChild('gantt_here', { static: true }) ganttContainer!: ElementRef;
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
    this.query.AllChildren = true;
    this.query.AllParent = true;
  }

  preLoadData(event?: any): void {
    super.loadedData(event);
  }

  ionViewDidEnter() {
    super.ionViewDidEnter();

    var holidays = [
      new Date(2023, 0, 1),
      new Date(2023, 0, 21),
      new Date(2023, 3, 16),
      new Date(2023, 3, 30), //CN
      new Date(2023, 4, 1),
      new Date(2023, 4, 2), //Nghỉ bù
      new Date(2023, 4, 12),
      new Date(2023, 4, 27),
      new Date(2023, 5, 16),
      new Date(2023, 6, 4),
      new Date(2023, 8, 2),
      new Date(2023, 9, 14),
      new Date(2023, 10, 28),
      new Date(2023, 11, 25),
    ];

    for (var i = 0; i < holidays.length; i++) {
      gantt.setWorkTime({
        date: holidays[i],
        hours: false,
      });
    }

    gantt.config.grid_resize = true;
    gantt.config.scales = [
      { unit: 'month', step: 1, format: '%F, %Y' },
      { unit: 'day', step: 1, format: '%D %j/%n' }, //https://docs.dhtmlx.com/gantt/desktop__date_format.html
    ];

    gantt.config.drag_timeline = {
      ignore: '.gantt_task_line, .gantt_task_link',
      useKey: false,
    };
    gantt.config.date_format = '%Y-%m-%d %H:%i';
    gantt.config.work_time = true;
    gantt.templates.timeline_cell_class = function (task, date) {
      if (!gantt.isWorkTime(date)) return 'week_end';
      return '';
    };

    gantt.config.row_height = 25;
    gantt.config.scale_height = 50;

    gantt.config.scales = [
      { unit: 'month', step: 1, format: '%F, %Y' },
      { unit: 'day', step: 1, format: '%j, %D' },
    ];

    gantt.templates.rightside_text = function (start, end, task) {
      if (task.type == gantt.config.types.milestone) {
        return task.text;
      }
      return '';
    };

    gantt.config.lightbox.sections = [
      { name: 'description', height: 70, map_to: 'text', type: 'textarea', focus: true },
      { name: 'type', type: 'typeselect', map_to: 'type' },
      { name: 'time', type: 'duration', map_to: 'auto' },
    ];

    gantt.init(this.ganttContainer.nativeElement);

    //create task
    gantt.attachEvent('onTaskCreated', (task) => {
      task.id = 0;
      const date = new Date(task.start_date);
      const isoDateString = date.toISOString();
      task.start_date = isoDateString.slice(0, 19);
      this.openModalForNewTask(this.formatTask(task));
    });

    //update task
    gantt.attachEvent('onTaskDblClick', (id, e) => {
      let task = this.items.find((d) => d.Id == id);
      this.openModalForNewTask(task);
    });

    //delete link
    gantt.attachEvent('onLinkDblClick', (id, e) => {
      const link = gantt.getLink(id);
      const src = gantt.getTask(link.source);
      const trg = gantt.getTask(link.target);
      this.env
        .showPrompt('Bạn có chắc muốn xóa liên kết ' + '<b>' + src.text + '-' + trg.text + '</b>' + ' không?', null, '')
        .then((_) => {
          const deleteLink = dp._router.link.delete;
          deleteLink.call(dp._router.link, Number(id));
        })
        .catch((er) => {
          this.submitAttempt = false;
        });
    });

    const dp = gantt.createDataProcessor({
      task: {
        update: (data: Task) => this.updateTask(data),
      },
      link: {
        update: (data: Link) => this.updateLink(data),
        create: (data: Link) => this.createLink(data),
        delete: (id: any) => this.deleteLink(id),
      },
    });

    this.loadGantt();
  }

  async openModalForNewTask(task) {
    const modal = await this.modalController.create({
      component: TaskModalPage,
      componentProps: {
        task: task,
      },
      cssClass: 'modal90',
    });

    await modal.present();
    const {} = await modal.onWillDismiss();
    this.loadGantt();
  }

  loadGantt() {
    let queryTask: any = {
      Keyword: '',
      Take: 100,
      Skip: 0,
      AllChildren: true,
      AllParent: true,
    };

    let queryLink: any = {
      Keyword: '',
      Take: 100,
      Skip: 0,
    };
    let promiseTask = this.pageProvider.read(queryTask, this.pageConfig.forceLoadData);
    let promiseLink = this.taskLinkService.read(queryLink, this.pageConfig.forceLoadData);
    Promise.all([promiseTask, promiseLink]).then((values: any) => {
      let tasksData = values[0].data;
      this.items = tasksData;
      let linksData = values[1].data;
      let data: Task[] = tasksData.map((task: any) => {
        return {
          id: task.Id,
          text: task.Name,
          start_date: task.StartDate.substring(0, 10),
          type: task.Type,
          duration: task.Duration,
          progress: task.Progress,
          parent: task.IDParent,
          open: task.IsOpen,
        };
      });

      let links: Link[] = linksData.map((link: any) => {
        return {
          id: link.Id,
          source: link.Source,
          target: link.Target,
          type: link.Type,
        };
      });
      gantt.clearAll();
      gantt.parse({ data, links });
    });
  }

  updateTask(task: Task): Promise<void> {
    let _task = this.items.find((d) => d.Id == task.id);
    _task.StartDate = task.start_date;
    _task.Progress = task.progress;
    _task.Duration = task.duration;

    return new Promise((resolve, reject) => {
      this.pageProvider
        .save(_task, this.pageConfig.isForceCreate)
        .then((savedItem: any) => {
          this.env.showTranslateMessage('Saving completed!', 'success');
          resolve(savedItem.Id);
          this.submitAttempt = false;
        })
        .catch((err) => {
          this.env.showTranslateMessage('Cannot save, please try again', 'danger');
          this.submitAttempt = false;
          reject(err);
        });
    });
  }

  createLink(link: Link): Promise<Link> {
    link.id = 0;
    return new Promise((resolve, reject) => {
      this.taskLinkService
        .save(this.formatLink(link), this.pageConfig.isForceCreate)
        .then((savedItem: any) => {
          this.env.showTranslateMessage('Saving completed!', 'success');
          this.submitAttempt = false;
        })
        .catch((err) => {
          this.env.showTranslateMessage('Cannot save, please try again', 'danger');
          this.submitAttempt = false;
          reject(err);
        });
    });
  }

  updateLink(link: Link): Promise<void> {
    return new Promise((resolve, reject) => {
      this.taskLinkService
        .save(this.formatLink(link), this.pageConfig.isForceCreate)
        .then((savedItem: any) => {
          this.env.showTranslateMessage('Saving completed!', 'success');
          this.submitAttempt = false;
        })
        .catch((err) => {
          this.env.showTranslateMessage('Cannot save, please try again', 'danger');
          this.submitAttempt = false;
          reject(err);
        });
    });
  }

  deleteLink(id: number): Promise<void> {
    let link = gantt.getLink(id);
    return new Promise((resolve, reject) => {
      this.taskLinkService
        .delete(this.formatLink(link))
        .then(() => {
          this.env.showTranslateMessage('Deleted!', 'success');
          const linkElement = document.querySelector(`div[data-link-id="${id}"]`);
          if (linkElement) {
            linkElement.parentNode.removeChild(linkElement);
          }
        })
        .catch((err) => {});
    });
  }

  formatTask(e) {
    const task = {
      IDBranch: this.env.selectedBranch,
      IDOpportunity: null,
      IDLead: null,
      IDProject: null,
      IDOwner: null,
      Code: '',
      Type: e?.type,
      Status: '',
      Remark: '',
      Sort: null,
      EndDate: null,
      PredictedClosingDate: null,
      ExpectedRevenue: 0,
      BudgetedCost: 0,
      ActualCost: 0,
      ActualRevenue: 0,
      StartDatePlan: null,
      EndDatePlan: null,
      DurationPlan: null,
      Deadline: null,
      Priority: null,
      IsUnscheduled: null,
      IsSplited: null,
      IsDisabled: null,
      IsDeleted: null,
      CreatedBy: '',
      ModifiedBy: '',
      CreatedDate: '',
      ModifiedDate: '',
      Id: e.id,
      Name: e.text,
      StartDate: e.start_date,
      Duration: e.duration,
      Progress: e.progress ?? null,
      IDParent: e.parent,
      IsOpen: e.open ? (e.open !== '' ? e.open : null) : null,
    };
    return task;
  }

  formatLink(e) {
    const link = {
      Code: '',
      Type: e.type,
      Source: e.source,
      Target: e.target,
      Remark: '',
      Sort: null,
      IsDisabled: null,
      IsDeleted: null,
      CreatedBy: '',
      ModifiedBy: '',
      CreatedDate: '',
      ModifiedDate: '',
      Id: e.id,
      Name: e?.text,
    };
    return link;
  }
}
