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
      new Date(2024, 0, 1),
      new Date(2024, 0, 21),
      new Date(2024, 3, 16),
      new Date(2024, 3, 30), //CN
      new Date(2024, 4, 1),
      new Date(2024, 4, 2), //Nghỉ bù
      new Date(2024, 4, 12),
      new Date(2024, 4, 27),
      new Date(2024, 5, 16),
      new Date(2024, 6, 4),
      new Date(2024, 8, 2),
      new Date(2024, 9, 14),
      new Date(2024, 10, 28),
      new Date(2024, 11, 25),
    ];

    for (var i = 0; i < holidays.length; i++) {
      gantt.setWorkTime({
        date: holidays[i],
        hours: false,
      });
    }


    gantt.config.resize_rows = true;
    gantt.config.min_task_grid_row_height = 45;
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


    let firstGridColumns = {
      columns: [
        { name: "text", label: "Task Name", tree: true, width: "*", min_width: 150, resize: true },
        { name: "start_date", label: "Start Time", align: "center", resize: true },
        { name: "duration", label: "Duration", align: "center", width: 70, resize: true },
        { name: "progress", label: "Progress", width: 50, resize: true, align: "center", 
          template: function (task) {
              return Math.round(task.progress * 100) + "%"
          }
        },
        { name: "add", label: "", align: "center", width: 60 }
      ]
    };
    // let secondGridColumns = {
    //   columns: [
    //     {
    //       name: "status", label: "Status", width: 60, resize: true, align: "center", template: (task) => {
    //         var progress = task.progress || 0;
    //         var status = progress === 1 ? "Done" : "Processing";
    //         var color = progress === 1 ? "green" : "orange";
    //         return "<div style='color: " + color + "'>" + status + "</div>";
    //       }
    //     }
    //   ]
    // };
  
    gantt.config.layout = {
      css: "gantt_container",
      rows: [
        {
          cols: [
            {view: "grid", width: 320, scrollY: "scrollVer", config: firstGridColumns},
            {resizer: true, width: 1},
            {view: "timeline", scrollX: "scrollHor", scrollY: "scrollVer"},
            {resizer: true, width: 1},
           
            {view: "scrollbar", id: "scrollVer"}
          ]
  
        },
        {view: "scrollbar", id: "scrollHor", height: 20}
      ]
    };

    gantt.config.row_height = 50;
    gantt.config.scale_height = 50;
    gantt.config.open_tree_initially = true;

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

    gantt.config.grid_resize = true;
    gantt.init(this.ganttContainer.nativeElement);

    //create task
    gantt.attachEvent('onTaskCreated', (task: any) => {
      task.id = 0;
      task.durationPlan = 1;

      const startDate = new Date();
      const utcStartDate = new Date(startDate.getTime() - (startDate.getTimezoneOffset() * 60000));
      task.start_date = utcStartDate.toISOString().slice(0, 19);
      task.start_date_plan = task.start_date;

      const endDate = new Date(utcStartDate.getTime() + (24 * 60 * 60 * 1000));
      task.end_date = endDate.toISOString().slice(0, 19);
      task.end_date_plan = task.end_date;

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
      if (this.submitAttempt == false) {
        this.submitAttempt = true;
        this.env
          .showPrompt(
            'Bạn có chắc muốn xóa liên kết ' + '<b>' + src.text + '-' + trg.text + '</b>' + ' không?',
            null,
            '',
          )
          .then((_) => {
            this.submitAttempt = false;
            const deleteLink = dp._router.link.delete;
            deleteLink.call(dp._router.link, Number(id)); 
          })
          .catch((er) => {
            this.submitAttempt = false;
          });
      }
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
          end_date: task.EndDate?.substring(0, 10),
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
      gantt.eachTask((task) =>{
        task.$open = true;
      });
      gantt.render();
    });
  }

  updateTask(task: Task): Promise<void> {
    let _task = this.items.find((d) => d.Id == task.id);
    _task.StartDate = task.start_date;
    _task.EndDate = task.end_date;
    _task.Progress = task.progress;
    _task.Duration = task.duration;

    return new Promise((resolve, reject) => {
      if (this.submitAttempt == false) {
        this.submitAttempt = true;
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
      }
    });
  }

  createLink(link: Link): Promise<Link> {
    link.id = 0;
    return new Promise((resolve, reject) => {
      if (this.submitAttempt == false) {
        this.submitAttempt = true;
        this.taskLinkService
          .save(this.formatLink(link), this.pageConfig.isForceCreate)
          .then((data: any) => {
            this.env.showTranslateMessage('Saving completed!', 'success');
            this.submitAttempt = false;
          })
          .catch((err) => {
            this.env.showTranslateMessage('Cannot save, please try again', 'danger');
            this.submitAttempt = false;
            reject(err);
          });
      }
    });
  }

  updateLink(link: Link): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.submitAttempt == false) {
        this.submitAttempt = true;
        this.taskLinkService
          .save(this.formatLink(link), this.pageConfig.isForceCreate)
          .then((data: any) => {
            this.env.showTranslateMessage('Saving completed!', 'success');
            this.submitAttempt = false;
          })
          .catch((err) => {
            this.env.showTranslateMessage('Cannot save, please try again', 'danger');
            this.submitAttempt = false;
            reject(err);
          });
      }
    });
  }

  deleteLink(id: number): Promise<void> {
    let link = gantt.getLink(id);
    return new Promise((resolve, reject) => {
      if (this.submitAttempt == false) {
        this.submitAttempt = true;
        this.taskLinkService
          .delete(this.formatLink(link))
          .then(() => {
            this.env.showTranslateMessage('Deleted!', 'success');
            const linkElement = document.querySelector(`div[data-link-id="${id}"]`);
            if (linkElement) {
              linkElement.parentNode.removeChild(linkElement);
            }
            this.submitAttempt = false;
          })
          .catch((err) => {
            this.env.showTranslateMessage('Cannot save, please try again', 'danger');
            this.submitAttempt = false;
            reject(err);
          });
      }
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
      EndDate: e.end_date ?? null,
      PredictedClosingDate: null,
      ExpectedRevenue: 0,
      BudgetedCost: 0,
      ActualCost: 0,
      ActualRevenue: 0,
      StartDatePlan: e.start_date_plan ?? null,
      EndDatePlan: e.end_date_plan ?? null,
      DurationPlan: e.durationPlan ?? null,
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
