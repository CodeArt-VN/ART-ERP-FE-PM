import { Component, ElementRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider, PM_TaskLinkProvider, PM_TaskProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { gantt } from 'dhtmlx-gantt';

import { environment } from 'src/environments/environment';
import { Link, Task } from '../../../_models/task';
import { TaskModalPage } from '../../../task-modal/task-modal.page';

@Component({
  encapsulation: ViewEncapsulation.None,
  selector: 'app-gantt',
  templateUrl: 'gantt.component.html',
  styleUrls: ['gantt.component.scss'],
})
export class GanttComponent extends PageBase {
  @ViewChild('gantt_here', { static: true }) ganttContainer!: ElementRef;
  linksData: any;
  listParent: any[];
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
    super.preLoadData(event);
    this.initGantt();
  }
  ionViewDidEnter() {
    super.ionViewDidEnter();
    //Resize grid when parent dom resize
    var gantt_here = document.getElementById('gantt_here');
    new ResizeObserver(() => gantt.setSizes()).observe(gantt_here);
  }

  initGantt() {

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
        { name: 'text', label: 'Task Name', tree: true, width: '*', min_width: 150, resize: true },
        { name: 'start_date', label: 'Start Time', align: 'center', resize: true },
        { name: 'duration', label: 'Duration', align: 'center', width: 70, resize: true },
        {
          name: 'owner',
          label: 'Owner',
          width: 50,
          resize: true,
          align: 'center',
          template: (task) => {
            if (task.avatar_owner) {
              return `<div class="avatar-container">
                      <div class="avatar" style="">
                          <img src="${task.avatar_owner}"  onError="this.src='../../assets/avartar-empty.jpg'" title="${task.full_name_owner}" >
                      </div>
                      </div>`;
            }
          },
        },
        { name: 'add', label: '', align: 'center', width: 40 },
      ],
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
      css: 'gantt_container',
      rows: [
        {
          cols: [
            { view: 'grid', width: 320, scrollY: 'scrollVer', config: firstGridColumns },
            { resizer: true, width: 1 },
            { view: 'timeline', scrollX: 'scrollHor', scrollY: 'scrollVer' },
            { resizer: true, width: 1 },
            //{ view: 'grid', width: 120, scrollY: 'scrollVer', config: secondGridColumns },
            { view: 'scrollbar', id: 'scrollVer' },
          ],
        },
        { view: 'scrollbar', id: 'scrollHor', height: 20 },
      ],
    };

    gantt.config.show_errors = false;
    //gantt.config.row_height = 0;
    //gantt.config.scale_height = 50;
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
    
    gantt.detachAllEvents();

    //create task
    gantt.attachEvent('onTaskCreated', (task: any) => {
      task.id = 0;
      task.durationPlan = 1;
      const startDate = new Date();
      const utcStartDate = new Date(startDate.getTime() - startDate.getTimezoneOffset() * 60000);
      task.start_date = utcStartDate.toISOString().slice(0, 19);
      task.start_date_plan = task.start_date;

      const endDate = new Date(utcStartDate.getTime() + 24 * 60 * 60 * 1000);
      task.end_date = endDate.toISOString().slice(0, 19);
      task.end_date_plan = task.end_date;

      this.openModalForNewTask(this.formatTask(task), this.listParent);
    });

    //update task
    gantt.attachEvent('onTaskDblClick', (id, e) => {
      let task = this.items.find((d) => d.Id == id);
      this.openModalForNewTask(task, this.listParent);
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
  }

  loadData(event = null) {
    this.parseSort();

    if (this.pageProvider && !this.pageConfig.isEndOfData) {
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
          Skip: this.items.length,
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

  add() {
    const task: any = {};
    task.id = 0;
    task.text = 'New task';
    task.duration = 1;
    task.durationPlan = 1;
    const startDate = new Date();
    const utcStartDate = new Date(startDate.getTime() - startDate.getTimezoneOffset() * 60000);
    task.start_date = utcStartDate.toISOString().slice(0, 19);
    task.start_date_plan = task.start_date;
    const endDate = new Date(utcStartDate.getTime() + 24 * 60 * 60 * 1000);
    task.end_date = endDate.toISOString().slice(0, 19);
    task.end_date_plan = task.end_date;
    this.openModalForNewTask(this.formatTask(task), this.listParent);
  }

  loadedData(event = null, ignoredFromGroup = false) {
    this.pageConfig.showSpinner = false;
    event?.target?.complete();
    this.loadGantt();
  }

  loadGantt() {
    let data: Task[] = this.items.map((task: any) => {
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
        avatar_owner: task.AvatarOwner,
        full_name_owner: task._Staff?.FullName ?? '',
      };
    });

    let links: Link[] = this.linksData.map((link: any) => {
      return {
        id: link.Id,
        source: link.Source,
        target: link.Target,
        type: link.Type,
      };
    });
    gantt.clearAll();
    gantt.parse({ data, links });
    gantt.templates.task_text = (start: Date, end: Date, task: any): string => {
      let owner = [task.full_name_owner];
      let avatarHtml = '<div class="avatar-container">';
      for (let i = 0; i < owner.length; i++) {
        avatarHtml += `
            <div class="avatar">
                <img src="${task.avatar_owner}" onError="this.src='../../assets/avartar-empty.jpg'" title="${task.full_name_owner}" alt="Avatar">
            </div>
          `;
      }
      avatarHtml += '</div>';
      const textHtml = `
        <div class="text">
            ${task.text}
        </div>`;

      return avatarHtml + textHtml;
    };

    gantt.eachTask((task) => {
      task.$open = true;
    });
    gantt.render();
  }

  autoCalculateLink() {
    let currentLinks: any[] = gantt.getLinks();
    let linksUpdate: any[] = [];
    let linksDelete: any[] = [];
    //ST (source, target)
    let processedSTPairs: any[] = [];

    currentLinks
      .map((link: any) => {
        let sourceTask: any = gantt.getTask(link.source);
        let targetTask: any = gantt.getTask(link.target);
        let priority = this.calculatePriority(sourceTask, targetTask);
        let existingLink: any = gantt.getLink(link.id);
        let currentSTPair = [sourceTask?.id, targetTask?.id];
        if (!sourceTask || !targetTask) {
          linksDelete.push(link);
        } else {
          if (this.checkExistLink(currentSTPair, processedSTPairs)) {
            linksDelete.push(link);
          } else {
            if (existingLink && existingLink.type !== priority.toString() && priority !== -1) {
              link.type = priority.toString();
              linksUpdate.push(link);
            } else if (priority === -1) {
              linksDelete.push(link);
            }
          }
          processedSTPairs.push(currentSTPair);
        }
        return null;
      })
      .filter((link) => link !== null);

    if (this.submitAttempt == false) {
      this.submitAttempt = true;
      this.env
        .showPrompt('Bạn có chắc muốn sắp xếp lại các liên kết không?', null, '')
        .then((_) => {
          let obj = {
            LinksUpdate: linksUpdate,
            LinksDelete: linksDelete.map((link) => link.id),
          };
          this.pageProvider.commonService
            .connect('POST', 'PM/TaskLink/AutoCalculateLink', obj)
            .toPromise()
            .then((data: any) => {
              //render event
              this.loadData();
              this.submitAttempt = false;
            })
            .catch((er) => {
              this.submitAttempt = false;
            });
        })
        .catch((er) => {
          this.submitAttempt = false;
        });
    }
  }

  private checkExistLink(currentSTPair: any[], processedSTPairs: any[]): boolean {
    return processedSTPairs.some(
      (d) =>
        (d[0] === currentSTPair[0] && d[1] === currentSTPair[1]) ||
        (d[0] === currentSTPair[1] && d[1] === currentSTPair[0]),
    );
  }

  private calculatePriority(sourceTask, targetTask) {
    if (!sourceTask || !targetTask) return -1;

    if (sourceTask.end_date <= targetTask.start_date) {
      // FS: Finish-to-Start
      return 0;
    }
    if (sourceTask.start_date >= targetTask.start_date) {
      // SS: Start-to-Start
      return 1;
    }
    if (sourceTask.end_date <= targetTask.end_date) {
      // FF: Finish-to-Finish
      return 2;
    }
    if (sourceTask.start_date >= targetTask.end_date) {
      // SF: Start-to-Finish
      return 3;
    }

    return -1;
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
    let idBefore = link.id;
    link.id = 0;
    return new Promise((resolve, reject) => {
      if (this.submitAttempt == false) {
        this.submitAttempt = true;
        this.taskLinkService
          .save(this.formatLink(link), this.pageConfig.isForceCreate)
          .then((data: any) => {
            //delete library link create
            gantt.deleteLink(idBefore);
            const newLink = {
              id: data.Id,
              source: link.source,
              target: link.target,
              type: link.type,
            };
            //add new
            gantt.addLink(newLink);
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
            gantt.deleteLink(id);
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
      IDParent: parseInt(e?.parent),
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
