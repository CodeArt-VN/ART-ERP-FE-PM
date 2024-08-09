import { Component, EventEmitter, Input, OnInit, Output, ViewChild, ViewEncapsulation } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import {
  BRA_BranchProvider,
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
      this.groupBy.level2.list =this.priorityList;
      if (typeof kanban !== 'undefined') this.initKanban();
      else {
        this.dynamicScriptLoaderService
          .loadResources(this.kanbanSource.source)
          .then(() => {
            setTimeout(() => {
              this.initKanban();
            }, 1);
            
          })
          .catch((error) => console.error('Error loading script', error));
      }
    });
  }

  initKanban() {
    if (this.groupByConfig?.ViewConfig) {
      //if(!this.groupByConfig?.ViewActive) {
        //config in view
        this.statusSelected = this.groupByConfig.ViewConfig?.GroupBy[0]?.Status;
        this.statusOrder = this.groupByConfig.ViewConfig?.GroupBy[0]?.OrderBy;
        this.prioritySelected = this.groupByConfig.ViewConfig?.GroupBy[1]?.Priority;
        this.priorityOrder = this.groupByConfig.ViewConfig?.GroupBy[1]?.OrderBy;
      //}else {
        //config in space
        //this.priorityOrder = this.groupByConfig.ViewActive;
     // }
    }
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
      };
    });

    let priorityList: any[] = this.priorityList?.map((priority: any) => {
      const code = parseInt(priority.Code);
      return {
        id: code,
        label: priority.Name,
        value: code,
        color: this.convertColorToHex(priority.Color.toLowerCase()),
      };
    });
    let columns: any[] = this.statusList?.map((status: any) => {
      return {
        id: status.Code,
        label: status.Name,
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
      color: true,
      menu: true,
      cover: true,
      attached: false,
    };

    const board = new kanban.Kanban('#kanban_here', {
      rows,
      columns,
      rowKey: 'row_custom_key',
      columnKey: 'column_custom_key',
      cards,
      cardShape,
      readonly: {
        edit: false,
        add: false,
        select: true,
        dnd: true,
      },
    });

    board.api.intercept('select-card', ({ id }) => {
      let task = this.items.find((d) => d.Id == id);
      if (task) {
        this.onOpenTask({ Id: task.Id, IDParent: task.IDParent });
      }
      return false;
    });

    board.api.intercept('add-card', (obj) => {
      if (!obj.before) {
        this.onOpenTask({ Id: 0, Status: obj.columnId, Type: obj.rowId });
      }
      return false;
    });

    board.api.intercept('duplicate-card', (obj) => {
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

    // board.api.on('update-card', (obj) => {
    //   console.log(obj);
    // });
    // board.api.intercept('delete-card', (obj) => {
    //   console.log(obj.id);
    //   return false;
    // });
  }



  changeSelected(type) {
    if (type == 'Status') {
      this.statusSelected.Type = 'Active';
    } else {
      this.prioritySelected.Type = 'Active';
    }
    this.saveGroupBy();
  }

  saveGroupBy() {
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
    if(this.groupByConfig?.ViewActive) {
      obj.View = this.groupByConfig?.ViewConfig.View;
      //save change in space
      let submitItem: any = {
        Id: this.groupByConfig.Id,
      };
      //gán lại view
     
      submitItem.ViewConfig =  JSON.stringify(this.groupByConfig.SpaceConfig.map((item) => {
        if (item.Code == this.groupByConfig.ViewActive) {
          return {
            ...item,
            GroupBy: obj.GroupBy,
            View: obj.View
          };
        }
        return item;
      }));
     
      console.log(submitItem);
      console.log(JSON.parse(submitItem.ViewConfig));
  
      // if (this.submitAttempt == false) {
      //   this.submitAttempt = true;
      //   this.viewProvider
      //     .save(submitItem)
      //     .then((result: any) => {
      //       this.groupByConfig.Id = result.Id;
      //       this.env.showTranslateMessage('View saved', 'success');
      //       this.submitAttempt = false;
      //       this.loadedData();
      //     })
      //     .catch((err) => {
      //       this.env.showTranslateMessage('Cannot save, please try again', 'danger');
      //       this.submitAttempt = false;
      //     });
      // }
    }else {
      //save change in view
      let submitItem: any = {
        Id: this.groupByConfig?.Id ?? 0,
        IDProject: this.groupByConfig?.IDProject,
        Type: this.groupByConfig.Type,
        Name: this.groupByConfig.Name
      };
  
      obj.View = this.groupByConfig?.ViewConfig.View;
      submitItem.ViewConfig = JSON.stringify(obj);
  
      if (this.submitAttempt == false) {
        this.submitAttempt = true;
        this.viewProvider
          .save(submitItem)
          .then((result: any) => {
            this.groupByConfig.Id = result.Id;
            this.env.showTranslateMessage('View saved', 'success');
            this.submitAttempt = false;
            this.loadedData();
          })
          .catch((err) => {
            this.env.showTranslateMessage('Cannot save, please try again', 'danger');
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
