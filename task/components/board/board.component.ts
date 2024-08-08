import { FormGroup } from '@angular/forms';
import { filter } from 'rxjs';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider, PM_TaskLinkProvider, PM_TaskProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { thirdPartyLibs } from 'src/app/services/static/thirdPartyLibs';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
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
  //bấm vào group mở popover, 2 dòng chọn
  board;
  showBoardContent = false;
  groupBy = {
    level1: {
      property: 'Status',
      order: 'Descending',
      list: [
        // { Id: 1, Code: 'todo', Name: 'Todo', Type: 'Active', Icon: 'flag-outline', Color: '', Remark: '1' },
        // { Id: 1, Code: 'review', Name: 'Review', Type: 'Active', Icon: 'flag-outline', Color: '', Remark: '2' },
        // { Id: 1, Code: 'coding', Name: 'Coding', Type: 'Active', Icon: 'flower-outline', Color: 'blue', Remark: '1' },
        // { Id: 1, Code: 'testing', Name: 'Testing', Type: 'Active', Icon: 'flag-outline', Color: '', Remark: '2' },
        // { Id: 1, Code: 'done', Name: 'Done', Type: 'Active', Icon: 'flag-outline', Color: '', Remark: '1' },
      ],
    },
    level2: {
      property: 'Priority',
      order: 'Ascending',
      list: [
        { Id: 1, Code: '5', Name: 'HighPriorityUrgent', Type: 'Active', Icon: 'flag-outline', Color: '', Remark: '1' },
        { Id: 1, Code: '1', Name: 'No', Type: 'Active', Icon: 'flag-outline', Color: '', Remark: '1' },
        { Id: 1, Code: '2', Name: 'NotPriorityNotUrgent', Type: 'Active', Icon: 'flag-outline', Color: '', Remark: '2' },
        { Id: 1, Code: '3', Name: 'LowPriorityUrgent', Type: 'Active', Icon: 'flower-outline', Color: 'red', Remark: '1' },
        { Id: 1, Code: '4', Name: 'MediumPriorityNotUrgent', Type: 'Active', Icon: 'flag-outline', Color: '', Remark: '2' },
      ],
    },
  };
  statusSelected = {
    Code: 'Status', Name: 'Status'
  };

  prioritySelected = {
    Code: '3', Name: 'LowPriorityUrgent', Type: 'Active', Icon: 'flower-outline', Color: 'red',
  };
  orderList = [{
    Code: 'desc', Name: 'Descending',
  },
  {
    Code: 'asc', Name: 'Ascending',
  }];


  priorities: string[] = [...new Set(this.groupBy.level2.list.map((task) => task.Code))];
  kanbanSource = {
    source: [
      { url: 'assets/kanban/kanbanmin.css', type: 'css' },
      { url: 'assets/kanban/kanbanmin.js', type: 'js' },
    ],
  };

  @Input() items: any;
  @Input() statusList: any;
  @Input() viewList: any;
  @Input() listParent: any[] = [];
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
    public dynamicScriptLoaderService: DynamicScriptLoaderService,
  ) {}

  ngOnInit(): void {
    this.groupBy.level1.list = this.viewList;
  }

  priorityList;
  typeList;
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
      if (typeof kanban !== 'undefined') this.initKanban();
      else {
        this.dynamicScriptLoaderService
          .loadResources(this.kanbanSource.source)
          .then(() => {
            this.initKanban();
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

    let data: any[] = this.items.map((task: any) => {
      return {
        id: task.Id,
        label: task.Name,
        priority: task.Priority,
        users: (task._members || []).map((d) => d.Id),
        start_date: task.StartDate.substring(0, 10),
        end_date: task.EndDate?.substring(0, 10),
        row_custom_key: task.Type,
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

    let rows = [
      { id: 'Folder', label: 'Folder' },
      { id: 'List', label: 'List' },
      { id: 'Backlog', label: 'Backlog' },
      { id: 'Project', label: 'Project' },
      { id: 'Task', label: 'Task' },
      { id: 'Todo', label: 'Todo' },
      { id: 'Milestone', label: 'Milestone' },
    ];

    rows.forEach((row: any) => {
      const check = data.some((task) => task.row_custom_key === row.id);
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
        dnd: true
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
      if(!obj.before) {
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

    // board.api.on('move-card', (obj) => {
    //   console.log(obj);
    // });
    board.api.on("update-card", (obj) => {
      console.log(obj);
  });
    board.api.intercept("delete-card", (obj) => {
      
      console.log(obj.id);
      return false;
  });
  }

  changeStatus(code) {
    const selectedStatus = this.groupBy.level1.list.find(status => status.Code == code);
    if (selectedStatus) {
      this.statusSelected = selectedStatus;
    }
  }

  changePriority(code) {
    const selectedPriority = this.groupBy.level2.list.find(priority => priority.Code == code);
    if (selectedPriority) {
      this.prioritySelected = selectedPriority;
    }
  }

  changeOrderBy(level, order) {
    if (level == 'status') {
      this.groupBy.level1.order = order;
    } else if (level === 'priority') {
      this.groupBy.level2.order = order;
    }
  }

  deleteGroup(e) {
    if(e == 'status') {
      this.statusSelected = null;
      this.groupBy.level1.order = null;
    }else {
      this.prioritySelected = null;
      this.groupBy.level2.order = null;
    }
  }


  @Output() openTask = new EventEmitter();
  onOpenTask(task) {
    this.openTask.emit(task);
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
