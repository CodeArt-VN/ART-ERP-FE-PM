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

  group1Selected;
  group2Selected;
  group1Order;
  group2Order;

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
      color: true,
      menu: true,
      cover: false,
      attached: false,
    };

    const cardTemplate = ({ cardFields, selected, dragging, cardShape }, viewConfig) => {
      const {
        task,
        id,
        label,
        priority,
        users,
        start_date,
        end_date,
        status,
        progress,
        duration,
        row_custom_key,
        column_custom_key,
      } = cardFields;

      const showEmptyFields = viewConfig.Layout.Card.IsEmptyFields;
      const stackFields = viewConfig.Layout.Card.IsStackFields;

      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
      };

      const optionsStartEnd: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      };

      if (viewConfig?.Fields) {
        const generateFieldsHtml = (fields, showEmptyFields, stackFields) => {
          const fieldHtml = fields
            .map((field) => {
              const color = field.Color || '';
              const icon = field.Icon || '';
              const fieldValue = task[field.Name] || '-';

              const show = showEmptyFields || task[field.Name];
              const displayText = task[field.Name] ? `${field.Name}: ${fieldValue}` : showEmptyFields ? `-` : '';

              return show
                ? `
            <div class="wx-card-icons svelte-vhwr63">
              <div class="wx-icons-container svelte-vhwr63">
                <div class="wx-date svelte-vhwr63">
                  <span class="icon-status">
                    <ion-icon class="menu-icon ios ion-color ion-color-${color} hydrated" role="img" name="${icon}"></ion-icon>
                  </span>
                  <span class="wx-date-value svelte-vhwr63">${displayText}</span>
                </div>
              </div>
              <div class="wx-icons-container svelte-vhwr63">  </div>
            </div>
          `
                : '';
            })
            .join('');

          if (stackFields) {
            return `
            <div class="wx-footer svelte-vhwr63 stack-fields">
              ${fieldHtml}
            </div>
          `;
          } else {
            return `
            <div class="wx-footer svelte-vhwr63 no-stack-fields">
              ${fieldHtml}
            </div>
          `;
          }
        };

        const fieldsHtml = generateFieldsHtml(viewConfig.Fields, showEmptyFields, stackFields);
        return `
          <div class="wx-content svelte-kqkezg">
              <div class="wx-card-header svelte-upffav">
              </div>
              <div class="wx-body svelte-kqkezg">
             
              </div>
     
              <div class="wx-footer  ${stackFields ? 'stack-fields' : 'no-stack-fields'} wx-with-content">
                 ${fieldsHtml}
              </div>
          </div>
    
        `;
      }
    };

    let viewConfig = [];
    if (this.groupByConfig?.ViewConfig) {
      if (this.groupByConfig?.SpaceViewActive) {
        // get config in space
        let boardInSpace = this.groupByConfig.ViewConfig.find((d) => d.Code == this.groupByConfig.SpaceViewActive);
        if (boardInSpace.GroupBy) {
          this.group1Selected = boardInSpace.GroupBy.Group1?.Code;
          this.group1Order = boardInSpace.GroupBy.Group1?.Sort;
          this.group2Selected = boardInSpace.GroupBy.Group2?.Code;
          this.group2Order = boardInSpace.GroupBy.Group2?.Sort;
          viewConfig = boardInSpace;
        }
      } else {
        // get config in view
        if (this.groupByConfig.ViewConfig?.GroupBy) {
          this.group1Selected = this.groupByConfig.ViewConfig.GroupBy.Group1?.Code;
          this.group1Order = this.groupByConfig.ViewConfig.GroupBy.Group1?.Sort;
          this.group2Selected = this.groupByConfig.ViewConfig.GroupBy.Group2?.Code;
          this.group2Order = this.groupByConfig.ViewConfig.GroupBy.Group2?.Sort;
        }
        viewConfig = this.groupByConfig.ViewConfig;
      }
    }

    this.board = new kanban.Kanban('#kanban_here', {
      rowKey: 'row_custom_key',
      columnKey: 'column_custom_key',
      cardShape,
      cardTemplate: kanban.template((card) => cardTemplate(card, viewConfig)),
      readonly: {
        edit: true,
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

    this.loadKanban();
  }

  loadKanban() {
    let data: any[] = this.items.map((task: any) => {
      return {
        task,
        id: task.Id,
        label: task.Name,
        priority: task.Priority,
        users: (task._members || []).map((d) => d.Id),
        start_date: task.StartDate.substring(0, 10),
        end_date: task.EndDate?.substring(0, 10),
        status: task.Status,
        progress: task.Progress * 100,
        duration: task.Duration,
        row_custom_key: task.Priority,
        column_custom_key: task.Status,
      };
    });
    const cards = data;

    let columns: any[] = this.items?.map((i: any) => {
      return {
        id: i.Id,
        label: i.Status,
      };
    });
   

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
            let itemUpdate = this.items.find((d) => d.Id == savedItem.Id);
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

  saveGroupBy() {
    //config template
    let submitItem: any = {
      Id: this.groupByConfig.Id,
      IDProject: this.groupByConfig.IDProject,
    };
    if (this.submitAttempt == false) {
      this.submitAttempt = true;
      if (this.groupByConfig.SpaceViewActive) {
        //space
        let spaceValue = this.groupByConfig.ViewConfig;
        let configSpace = spaceValue.map((item) => {
          if (item.Code == this.groupByConfig.SpaceViewActive) {
            let updatedItem = {
              ...item,
              GroupBy: {
                Group1: { Code: this.group1Selected, Sort: this.group1Order },
                Group2: { Code: this.group2Selected, Sort: this.group2Order },
              },
            };
            return updatedItem;
          }

          return item;
        });

        submitItem.ViewConfig = JSON.stringify(configSpace);
        this.spaceProvider
          .save(submitItem)
          .then((result: any) => {
            this.groupByConfig.Id = result.Id;
            this.env.showMessage('View saved', 'success');
            this.submitAttempt = false;
            this.loadedData();

          })
          .catch((err) => {
            this.env.showMessage('Cannot save, please try again', 'danger');
            this.submitAttempt = false;
          });
      } else {
        //view
        let viewConfig = this.groupByConfig.ViewConfig;
        viewConfig.GroupBy = {
          Group1: { Code: this.group1Selected, Sort: this.group1Order },
          Group2: { Code: this.group2Selected, Sort: this.group2Order },
        };

        submitItem.ViewConfig = JSON.stringify(viewConfig);
        this.viewProvider
          .save(submitItem)
          .then((result: any) => {
            this.groupByConfig.Id = result.Id;
            this.env.showMessage('View saved', 'success');
            this.submitAttempt = false;
            this.loadedData();
          })
          .catch((err) => {
            this.env.showMessage('Cannot save, please try again', 'danger');
            this.submitAttempt = false;
          });
      }
    }
  }

  getGroupName(selectedCode: any, level): string {
    if (level == 1) {
      const group = this.groupBy.level1.list.find((item) => item.Code == selectedCode);
      return group ? group.Name : selectedCode;
    } else {
      const group = this.groupBy.level2.list.find((item) => item.Code == selectedCode);
      return group ? group.Name : selectedCode;
    }
  }

  deleteGroup(e) {
    if (e == 'status') {
      this.group1Selected = null;
      this.group1Order = null;
    } else {
      this.group2Selected = null;
      this.group2Order = null;
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
