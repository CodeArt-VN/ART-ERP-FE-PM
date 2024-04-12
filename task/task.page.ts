import { Component, ElementRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider, PM_TaskLinkProvider, PM_TaskProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { gantt } from 'dhtmlx-gantt';
import { Link, Task } from '../_models/task';
import { TaskModalPage } from '../task-modal/task-modal.page';
import { environment } from 'src/environments/environment';
import { aW } from '@fullcalendar/core/internal-common';

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
              return `<div class="avatar" style="">
                          <img src="${task.avatar_owner}"  onError="this.src='../../assets/avartar-empty.jpg'" title="${task.full_name_owner}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover;">
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
      const utcStartDate = new Date(startDate.getTime() - startDate.getTimezoneOffset() * 60000);
      task.start_date = utcStartDate.toISOString().slice(0, 19);
      task.start_date_plan = task.start_date;

      const endDate = new Date(utcStartDate.getTime() + 24 * 60 * 60 * 1000);
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
      tasksData.forEach((p) => {
        p.AvatarOwner = '';
        if (p._Staff?.Code) {
          p.AvatarOwner = environment.staffAvatarsServer + p._Staff.Code + '.jpg';
        }
      });
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
          avatar_owner: task.AvatarOwner,
          full_name_owner: task._Staff?.FullName ?? '',
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
      gantt.templates.task_text = (start: Date, end: Date, task: any): string => {
        let avatarHtml = '';
        let avatarWidth = 34;
        let owner = [task.full_name_owner];
        for (let i = 0; i < owner.length; i++) {
          const leftPosition = i === 0 ? 5 : (25 * i);
          avatarHtml += `
              <div style="position: absolute; top: 4px; left: ${leftPosition}px; z-index: ${owner.length - i}">
                  <div class="avatar">
                      <img src="${task.avatar_owner}" onError="this.src='../../assets/avartar-empty.jpg'" title="${task.full_name_owner}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover;">
                  </div>
              </div>`;
              avatarWidth += i === 0 ? 10 : 20;
        }
        const textHtml = `
          <div class="text" style="margin-left: ${avatarWidth}px;">
              ${task.text}
          </div>`;

        return avatarHtml + textHtml;
      };

      gantt.eachTask((task) => {
        task.$open = true;
      });
      gantt.render();
    });
  }

  autoCalculateLink() {
    let currentLinks: any[] = gantt.getLinks();

    let linksUpdate: any[] = [];
    let linksDelete: any[] = [];

    currentLinks
      .map((link: any) => {
        let sourceTask: any = gantt.getTask(link.source);
        let targetTask: any = gantt.getTask(link.target);

        let priority = this.calculatePriority(sourceTask, targetTask);

        let existingLink: any = gantt.getLink(link.id);
        if (existingLink && existingLink.type !== priority.toString() && priority !== -1) {
          link.type = priority.toString();
          linksUpdate.push(link);
        } else if (!sourceTask || !targetTask || priority === -1) {
          linksDelete.push(link);
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
              this.loadGantt();
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

  calculatePriority(sourceTask, targetTask) {
    if (!sourceTask || !targetTask) return -1;

    if (sourceTask.end_date <= targetTask.start_date) {
      // FS: Finish-to-Start
      return 0;
    } else if (sourceTask.start_date >= targetTask.start_date) {
      // SS: Start-to-Start
      return 1;
    } else if (sourceTask.end_date <= targetTask.end_date) {
      // FF: Finish-to-Finish
      return 2;
    } else if (sourceTask.start_date >= targetTask.end_date) {
      // SF: Start-to-Finish
      return 3;
    } else {
      return -1;
    }
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
            //remove element, event
            const oldLinkElement = document.querySelector(`[data-link-id="${idBefore}"]`);
            if (oldLinkElement) {
              oldLinkElement.remove();
            }
            gantt.deleteLink(idBefore);
            const newLink = {
              id: data.Id,
              source: link.source,
              target: link.target,
              type: link.type,
            };
            //add new
            gantt.addLink(newLink);
            const linkElement = document.querySelector(`[data-link-id="${idBefore}"]`);
            if (linkElement) {
              linkElement.setAttribute('data-link-id', data.Id.toString());
              linkElement.setAttribute('link_id', data.Id.toString());
            }

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
