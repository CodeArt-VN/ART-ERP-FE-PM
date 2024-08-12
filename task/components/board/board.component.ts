import { Component, EventEmitter, Input, OnInit, Output, ViewChild, ViewEncapsulation } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import {
  BRA_BranchProvider,
  PM_SpaceProvider,
  PM_TaskLinkProvider,
  PM_TaskProvider,
  PM_ViewProvider,
} from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { DynamicScriptLoaderService } from 'src/app/services/custom.service';

declare var kanban: any;
@Component({
  encapsulation: ViewEncapsulation.None,
  selector: 'app-board',
  templateUrl: 'board.component.html',
  styleUrls: ['board.component.scss'],
})
export class BoardComponent implements OnInit {
  @ViewChild('groupPopover') groupPopover;

  statusSelected;
  prioritySelected;
  statusOrder;
  priorityOrder;

  priorityList;
  typeList;

  submitAttempt = false;
  board;
  showBoardContent = false;
  groupBy = {
    level1: {
      property: 'Status',
      order: [
        {
          Code: 'desc',
          Name: 'Descending',
        },
        {
          Code: 'asc',
          Name: 'Ascending',
        },
      ],
      list: [],
    },
    level2: {
      property: 'Priority',
      order: [
        {
          Code: 'desc',
          Name: 'Descending',
        },
        {
          Code: 'asc',
          Name: 'Ascending',
        },
      ],
      list: [],
    },
  };

  //lib
  kanbanSource = {
    source: [
      { url: 'assets/kanban/kanbanmin.css', type: 'css' },
      { url: 'assets/kanban/kanbanmin.js', type: 'js' },
    ],
  };

  @Input() items: any;
  @Input() groupByConfig: any;
  @Input() statusList: any;
  @Input() viewList: any;
  @Input() listParent: any[] = [];
  constructor(
    public pageProvider: PM_TaskProvider,
    public taskLinkService: PM_TaskLinkProvider,
    public viewProvider: PM_ViewProvider,
    public spaceProvider: PM_SpaceProvider,
    public branchProvider: BRA_BranchProvider,
    public modalController: ModalController,
    public popoverCtrl: PopoverController,
    public alertCtrl: AlertController,
    public loadingController: LoadingController,
    public env: EnvService,
    public navCtrl: NavController,
    public location: Location,
    public dynamicScriptLoaderService: DynamicScriptLoaderService,
  ) {}

  ngOnInit(): void {
    this.groupBy.level1.list = this.viewList;
  }

  ngAfterViewInit() {
    this.loadKanbanLibrary();
  }

  isGroupPopoverOpen = false;
  presentGroupPopover(e: Event) {
    this.groupPopover.event = e;
    this.isGroupPopoverOpen = true;
  }
  loadKanbanLibrary() {
    Promise.all([this.env.getType('TaskPriority'), this.env.getType('TaskType')]).then((values: any) => {
      this.priorityList = values[0];
      this.typeList = values[1];
      this.priorityList.forEach((i) => {
        i.Code = parseInt(i.Code);
      });
      this.groupBy.level2.list = this.priorityList;
      if (typeof kanban !== 'undefined') {
        setTimeout(() => {
          this.initKanban();
        }, 100);
      } else {
        this.dynamicScriptLoaderService
          .loadResources(this.kanbanSource.source)
          .then(() => {
            setTimeout(() => {
              this.initKanban();
            }, 100);
          })
          .catch((error) => console.error('Error loading script', error));
      }
    });
  }

  initKanban() {
    let allUsersSet = new Map<number, any>();
    this.items.forEach((item: any) => {
      if (Array.isArray(item._members)) {
        item._members.forEach((user: any) => {
          if (!allUsersSet.has(user.Id)) {
            allUsersSet.set(user.Id, {
              id: user.Id,
              label: user.FullName,
              avatar: user._avatar,
            });
          }
        });
      }
    });

    let allUsers = Array.from(allUsersSet.values());

    let priorityList: any[] = this.priorityList?.map((priority: any) => {
      const code = parseInt(priority.Code);
      return {
        id: code,
        label: priority.Name,
        value: code,
        color: this.convertColorToHex(priority.Color.toLowerCase()),
      };
    });

    const cardShape = {
      label: true,
      description: true,
      progress: true,
      start_date: true,
      end_date: true,
      users: {
        show: true,
        values: allUsers,
      },
      priority: {
        show: true,
        values: priorityList,
      },
      color: false,
      menu: false,
      cover: false,
      attached: false,
    };

    this.board = new kanban.Kanban('#kanban_here', {
      rowKey: 'row_custom_key',
      columnKey: 'column_custom_key',
      cardShape,
      readonly: {
        edit: false,
        add: false,
        select: true,
        dnd: true,
      },
    });

    this.board.api.intercept('select-card', ({ id }) => {
      let task = this.items.find((d) => d.Id == id);
      if (task) {
        this.onOpenTask({ Id: task.Id, IDParent: task.IDParent });
      }
      return false;
    });

    this.board.api.intercept('add-card', (obj) => {
      if (!obj.before) {
        this.onOpenTask({ Id: 0, Status: obj.columnId, Type: obj.rowId });
      }
      return false;
    });

    this.board.api.intercept('duplicate-card', (obj) => {
      let task = this.items.find((d) => d.Id == obj.id);
      let duplicateTask = { ...task };
      duplicateTask.Id = 0;
      duplicateTask.Name = null;
      duplicateTask.CreatedBy = null;
      duplicateTask.CreatedDate = null;
      duplicateTask.ModifiedBy = null;
      duplicateTask.ModifiedDate = null;
      this.onOpenTask(duplicateTask);
    });

    this.board.api.on('move-card', (task) => {
      this.updateTask(task);
    });

    if (this.groupByConfig?.ViewConfig) {
      if (this.groupByConfig?.SpaceViewActive) {
        // get config in space
        let boardInSpace = this.groupByConfig.ViewConfig.find((d) => d.Code == this.groupByConfig.SpaceViewActive);
        if (boardInSpace.GroupBy) {
          this.statusSelected = boardInSpace.GroupBy[0]?.Status;
          this.statusOrder = boardInSpace.GroupBy[0]?.OrderBy;
          this.prioritySelected = boardInSpace.GroupBy[1]?.Priority;
          this.priorityOrder = boardInSpace.GroupBy[1]?.OrderBy;
          //sort
          this.sortGroupBy();
        }
      } else {
        // get config in view
        if (this.groupByConfig.ViewConfig?.GroupBy) {
          this.statusSelected = this.groupByConfig.ViewConfig?.GroupBy[0]?.Status;
          this.statusOrder = this.groupByConfig.ViewConfig?.GroupBy[0]?.OrderBy;
          this.prioritySelected = this.groupByConfig.ViewConfig?.GroupBy[1]?.Priority;
          this.priorityOrder = this.groupByConfig.ViewConfig?.GroupBy[1]?.OrderBy;
          //sort
          this.sortGroupBy();
        }
      }
    }
    this.loadKanban();
  }

  loadKanban() {
    let columns: any[] = this.statusList?.map((status: any) => {
      return {
        id: status.Code,
        label: status.Name,
      };
    });

    let data: any[] = this.items.map((task: any) => {
      return {
        id: task.Id,
        label: task.Name,
        priority: task.Priority,
        users: (task._members || []).map((d) => d.Id),
        start_date: task.StartDate.substring(0, 10),
        end_date: task.EndDate?.substring(0, 10),
        row_custom_key: task.Priority,
        column_custom_key: task.Status,
        progress: task.Progress * 100,
        duration: task.Duration,
        duration_plan: task.DurationPlan,
        assignee : task.IDOwner,
        due_date : task.Deadline,
        date_updated : task.ModifiedDate,

      };
    });
    const cards = data;

    let rows: any[] = this.groupBy.level2.list.map((row: any) => {
      return {
        id: row.Code,
        label: row.Name,
      };
    });

    rows.forEach((row: any) => {
      const check = data.some((task) => task.priority == row.id);
      if (!check) {
        row.collapsed = true;
      }
    });
    this.board.parse({
      columns,
      cards,
      rows,
    });
  }

  changeSelected(type) {
    if (type == 'Status') {
      this.statusSelected.Type = 'Active';
    } else {
      this.prioritySelected.Type = 'Active';
    }
    this.saveGroupBy();
  }

  updateTask(task) {
    let _task = {
      Id: task.id,
      Priority: task.rowId,
      Status: task.columnId,
    };

    return new Promise((resolve, reject) => {
      if (this.submitAttempt == false) {
        this.submitAttempt = true;
        this.pageProvider
          .save(_task)
          .then((savedItem: any) => {
            let itemUpdate = this.items.find((d) => d.Id === savedItem.Id);
            if (itemUpdate) {
              itemUpdate.Priority = savedItem.Priority;
              itemUpdate.Status = savedItem.Status;
              this.loadKanban();
            }
            this.loadedData();
            this.env.showMessage('Saving completed!', 'success');
            resolve(savedItem.Id);
            this.submitAttempt = false;
          })
          .catch((err) => {
            this.env.showMessage('Cannot save, please try again', 'danger');
            this.submitAttempt = false;
            reject(err);
          });
      }
    });
  }

  sortGroupBy() {
    if (!this.statusSelected?.Code) {
      this.board.setSort({
        by: (obj) => obj.id,
        dir: 'desc',
        preserve: false,
      });

    }
    const sortDirection = this.statusOrder?.Code || 'desc';
      let sortField: (obj: any) => any;
      switch (this.statusSelected.Code) {
        case 'TaskName':
          sortField = (obj) => obj.label;
          break;
        case 'Status':
          sortField = (obj) => obj.column_custom_key;
          break;
        case 'Assignee':
          sortField = (obj) => obj.assignee;//
          break;
        case 'DueDate':
          sortField = (obj) => obj.due_date;//
          break;
        case 'Priority':
          sortField = (obj) => obj.priority;
          break;
        case 'DateCreated':
          sortField = (obj) => obj.start_date;
          break;
        case 'CustomTaskId':
          sortField = (obj) => obj.id;//
          break;
        case 'DateClosed':
          sortField = (obj) => obj.end_date;
          break;
        case 'DateUpdated':
          sortField = (obj) => obj.date_updated;//
          break;
        case 'Tags':
          sortField = (obj) => obj.label;//
          break;
        case 'TaskId':
          sortField = (obj) => obj.id;
          break;  
        case 'TimeEstimate':
          sortField = (obj) => obj.duration_plan;//
          break;
        case 'TimeTracked':
          sortField = (obj) => obj.label;//
          break;  
        default:
          sortField = (obj) => obj.label; // Default sorting Name
          break;
      }
      this.board.setSort({
        by: sortField,
        dir: sortDirection,
        preserve: false,
      });
  }

  saveGroupBy() {
    // config value
    let obj = {
      View: '',
      GroupBy: [
        {
          Status: {
            Id: this.statusSelected?.Id,
            Code: this.statusSelected?.Code,
            Name: this.statusSelected?.Name,
            Icon: this.statusSelected?.Icon,
            Color: this.statusSelected?.Color,
            Sort: this.statusSelected?.Sort,
            Enable: this.statusSelected?.Enable,
          },
          OrderBy: this.statusOrder,
        },
        {
          Priority: {
            Id: this.prioritySelected?.Id,
            Code: this.prioritySelected?.Code,
            Name: this.prioritySelected?.Name,
            Icon: this.prioritySelected?.Icon,
            Color: this.prioritySelected?.Color,
            Sort: this.prioritySelected?.Sort,
            Enable: this.prioritySelected?.Enable,
          },
          OrderBy: this.priorityOrder,
        },
      ],
    };

    if (this.groupByConfig?.SpaceViewActive) {
      //save change config in space
      let submitItem: any = {
        Id: this.groupByConfig.Id,
        IDProject: this.groupByConfig?.IDProject,
      };
      //change 'ViewConfig' in 'space' but not change previous 'ViewConfig'
      submitItem.ViewConfig = JSON.stringify(
        this.groupByConfig.ViewConfig.map((item) => {
          //check is board and add GroupBy, View
          if (item.Code == this.groupByConfig.SpaceViewActive) {
            return {
              ...item,
              GroupBy: obj.GroupBy,
              View: obj.View,
            };
          }
          return item;
        }),
      );

      if (this.submitAttempt == false) {
        this.submitAttempt = true;
        this.spaceProvider
          .save(submitItem)
          .then((result: any) => {
            this.groupByConfig.Id = result.Id;
            this.env.showMessage('View saved', 'success');
            this.submitAttempt = false;
            this.loadedData();
            //sort
            this.sortGroupBy();
          })
          .catch((err) => {
            this.env.showMessage('Cannot save, please try again', 'danger');
            this.submitAttempt = false;
          });
      }
    } else {
      //save change config in view
      let submitItem: any = {
        Id: this.groupByConfig?.Id ?? 0,
        IDProject: this.groupByConfig?.IDProject,
        Type: this.groupByConfig.Type,
        Name: this.groupByConfig.Name,
      };

      obj.View = this.groupByConfig?.ViewConfig.View;
      submitItem.ViewConfig = JSON.stringify(obj);

      if (this.submitAttempt == false) {
        this.submitAttempt = true;
        this.viewProvider
          .save(submitItem)
          .then((result: any) => {
            this.groupByConfig.Id = result.Id;
            this.env.showMessage('View saved', 'success');
            this.submitAttempt = false;
            this.loadedData();
            //sort
            this.sortGroupBy();
          })
          .catch((err) => {
            this.env.showMessage('Cannot save, please try again', 'danger');
            this.submitAttempt = false;
          });
      }
    }
  }

  deleteGroup(e) {
    if (e == 'status') {
      this.statusSelected = null;
      this.statusOrder = null;
    } else {
      this.prioritySelected = null;
      this.priorityOrder = null;
    }
    this.saveGroupBy();
  }

  @Output() openTask = new EventEmitter();
  onOpenTask(task) {
    this.openTask.emit(task);
  }

  @Output() loaded = new EventEmitter();
  loadedData() {
    this.loaded.emit();
  }
  convertColorToHex(colorName) {
    const colorMap = {
      primary: '#005ce6',
      secondary: '#32db64',
      tertiary: '#ffcc00',
      success: '#28a745',
      warning: '#ffc107',
      danger: '#dc3545',
      light: '#f4f4f4',
      medium: '#989aa2',
      dark: '#222428',
    };

    return colorMap[colorName] || null;
  }
}
