import { Component, Type, ViewEncapsulation } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import {
  PM_SpaceProvider,
  PM_SpaceStatusProvider,
  PM_TaskLinkProvider,
  PM_TaskProvider,
  PM_ViewProvider,
  SYS_SchemaProvider,
} from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { TaskModalPage } from '../task-modal/task-modal.page';

import { environment } from 'src/environments/environment';
import { lib } from 'src/app/services/static/global-functions';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';

@Component({
  encapsulation: ViewEncapsulation.None,
  selector: 'app-task',
  templateUrl: 'task.page.html',
  styleUrls: ['task.page.scss'],
})
export class TaskPage extends PageBase {
  /*
Contructor:
- Init page provider
- Get space id
- Get task id
- Get active segment view
  naviagte: /task/:id/:space/:view


Preload data:
1. Load space list
2. Load folder/list task => build tree
3. Load type + priority

Load data:
Load task list from id or show empty message

Loaded data:
- Process task list + link
- Set current space
- Load status list from space Id
- Get views/ default view from space
- Call Segment change to default view


Select task:
- Load data from task id

Add/Update task:
- Show modal with task data

Segment change:
- Active segment view
- Change view component
- Pass data to active view component

*/

  // URL params
  space = { Id: null, Name: '', statusList: [], activeSpace: null, spaceList: [] };
  view = { activeView: '', viewList: [] };

  typeList = [];
  spaceTreeList = []; // Header space stree data source
  selectedSpaceTask;

  listParent;
  linksData;

  taskList;

  editView; //form customize view
  itemsView = []; // item config in view
  statusGroupBy = []; //dataSource status

  viewConfig;
  groupByConfig;
  viewConfigActive = ''; // active View in config

  groupValue = [
    {
      Name: 'Shown',
    },
    {
      Name: 'Popular',
    },
    {
      Name: 'Hidden',
    },
  ];
  viewTypeDataSource = [
    {
      Code: 'List',
      Name: 'List',
    },
    {
      Code: 'Board',
      Name: 'Board',
    },
    {
      Code: 'Gantt',
      Name: 'Gantt',
    },
  ];

  constructor(
    public pageProvider: PM_TaskProvider,
    public spaceProvider: PM_SpaceProvider,
    public spaceStatusProvider: PM_SpaceStatusProvider,
    public viewProvider: PM_ViewProvider,
    public taskLinkService: PM_TaskLinkProvider,
    public schemaService: SYS_SchemaProvider,
    public navCtrl: NavController,
    public route: ActivatedRoute,
    public modalController: ModalController,
    public popoverCtrl: PopoverController,
    public alertCtrl: AlertController,
    public loadingController: LoadingController,
    public env: EnvService,
    public location: Location,
    router: Router,
    public formBuilder: FormBuilder,
  ) {
    super();

    // - Init page provider
    // - Get space id
    // - Get task id
    // - Get active segment view
    //   naviagte: /task/:id/:space/:view
    this.route.paramMap.subscribe((param) => {
      this.id = param.get('id') != 'null' ? parseInt(param.get('id')) : null;
      this.space.Id = param.get('space') != 'null' ? parseInt(param.get('space')) : null;
      this.view.activeView = param.get('view') != 'null' ? param.get('view') : null;
      if (this.space.activeSpace) this.refresh();
    });
  }

  preLoadData(event?: any): void {
    // - Load type + priority
    // - Load space list
    // - Load folder/list task => build tree

    this.pageConfig.pageTitle = '';

    this.env.getType('TaskType').then((value: any) => {
      this.typeList = value;
      this.typeList.unshift({ Code: 'Space', Name: 'Space', Icon: 'planet-outline', Color: 'primary' });

      let query: any = {
        AllParent: true,
        Type_in: '',
      };
      query.Type_in = JSON.stringify(
        this.typeList.map((e) => e.Code).filter((d) => d != 'Task' && d != 'Todo' && d != 'Milestone'),
      );

      Promise.all([this.spaceProvider.read(), this.pageProvider.read(query), this.schemaService.getAnItem(34)]).then(
        (values: any) => {
          this.space.spaceList = values[0].data;
          let taskList = values[1].data;
          let viewData = values[2].Fields;
          this.statusGroupBy = viewData;
          let groupedData = [];
          viewData?.forEach((item) => {
            item.Enable = false;
            item.Group = 'Hidden';
            if (!groupedData[item.Group]) {
              groupedData[item.Group] = [];
            }
            groupedData[item.Group].push(item);
          });
          this.itemsView = groupedData;

          for (let i = 0; i < this.space.spaceList.length; i++) {
            const space = this.space.spaceList[i];
            let taskRoots = values[1].data.filter((d) => d.IDParent == null && d.IDSpace == space.Id);
            let task = {
              Id: lib.generateCode(),
              Name: space.Name,
              IdParent: null,
              IDSpace: space.Id,
              Type: 'Space',
            };
            taskList.push(task);

            taskRoots.forEach((i) => {
              i.IDParent = task.Id;
            });
          }

          lib.buildFlatTree(taskList, []).then((result: any) => {
            this.spaceTreeList = result;
            this.spaceTreeList.forEach((i) => {
              i._Type = this.typeList.find((d) => d.Code == i.Type);
            });
          });

          super.preLoadData(event);
        },
      );
    });
  }

  loadData(event = null) {
    //Load task list from id or show empty message

    this.query.AllChildren = true;
    if (this.space.Id) {
      delete this.query.Id;
      delete this.query.IDSpace;
      if (this.id) this.query.Id = this.id;
      if (this.space.Id) this.query.IDSpace = this.space.Id;

      super.loadData(event);
    } else {
      this.loadedData(event);
    }
  }

  loadedData(event?: any, ignoredFromGroup?: boolean): void {
    // - Process task list + link
    // - Set current space
    // - Load status list from space Id
    // - Get views/ default view from space
    // - Call Segment change to default view

    // - loaded View config if change view
    Promise.all([this.viewProvider.read({ IDProject: this.id })]).then((values: any) => {
      if (values[0].data) {
        this.viewConfig = values[0].data;
      }
   
      this.items.forEach((i) => {
        i._isRoot = i.IDParent == null || i.Id == this.id;
        i._Type = this.typeList.find((d) => d.Code == i.Type);

        if (i._isRoot) {
          this.getAllChildrenHasOwner(i);
        }
      });

      if (this.items.length) {
        this.taskLinkService
          .read({
            Source: JSON.stringify(this.items.map((d) => d.Id)),
            Target: JSON.stringify(this.items.map((d) => d.Id)),
          })
          .then((resp: any) => {
            this.linksData = resp.data;
          });
      }

      let groupBy: any = {
        Id: 0,
        IDProject: parseInt(this.id),
        ViewConfig: '',
      };

      if (this.space.Id) {
        this.space.activeSpace = this.space.spaceList.find((d) => d.Id == this.space.Id);
        if (this.space.activeSpace) {
          this.space.Name = this.space.activeSpace.Name;

          this.view.viewList = JSON.parse(this.space.activeSpace.ViewConfig) || [];
          if (this.viewConfig) {
            let addViewConfig = this.viewConfig.map((item) => ({
              Code: item.Name,
              Name: item.Name,
            }));

            this.view.viewList = [...this.view.viewList, ...addViewConfig];
          }
          let defaultView = this.view.viewList.find((d) => d.Default);
          if (!defaultView && this.view.viewList.length) defaultView = this.view.viewList[0];

          if (!this.view.activeView) {
            if (defaultView) {
              this.view.activeView = defaultView?.Code;
            } else {
              this.env.showMessage('No view found, please check space config', 'warning');
            }
          }

          this.spaceStatusProvider.read({ IDSpace: this.space.Id }).then((resp: any) => {
            this.space.statusList = resp.data;
          });

          let isViewBoard = values[0].data.find((d) => d.Name == this.view.activeView);
          if (isViewBoard) {
            //custom view
            groupBy.ViewConfig = JSON.parse(isViewBoard?.ViewConfig);
            groupBy.Id = isViewBoard?.Id;
          } else {
            //space
            groupBy.Id = this.space.Id;
            groupBy.IDProject = parseInt(this.id);
            groupBy.ViewActive = this.view.activeView;

            groupBy.SpaceConfig = JSON.parse(this.space.activeSpace.ViewConfig);

            if (this.view.activeView == 'Board') {
              const viewConfig = Object.entries(this.itemsView).reduce((i, [groupName, items]) => {
                i[groupName] = items.map((item) => ({
                  Id: item.Id,
                  Code: item.Code,
                  Name: item.Name,
                  Icon: item.Icon,
                  Color: item.Color,
                  Sort: item.Sort,
                  Enable: item.Enable,
                }));
                return i;
              }, {} as { [key: string]: { Id: any; Code: string; Name: string; Icon: string; Color: string; Sort: string; Enable: string }[] });
              let obj = {
                View: viewConfig,
                Group: '',
              };
              let group = this.viewConfig.find((d) => d.Name == this.view.activeView);
              if (group) obj.Group = JSON.parse(group.ViewConfig)?.Group;
              groupBy.ViewConfig = JSON.stringify(obj);
            }
          }
      
        } else {
          this.env.showMessage('Space not found!', 'warning');
        }
      } else {
        this.view.viewList = [];
      }
      // groupByConfig
      this.groupByConfig = groupBy;

      let selectedSpaceTask = this.spaceTreeList.find((d) => d.Id == this.id);
      if (!selectedSpaceTask) selectedSpaceTask = this.spaceTreeList.find((d) => d.IDSpace == this.space.Id);
      if (selectedSpaceTask != this.selectedSpaceTask) this.selectedSpaceTask = selectedSpaceTask;
      super.loadedData(event, ignoredFromGroup);
    });
  }

  getAllChildrenHasOwner(item) {
    // Set item._members list
    // Check if item has _Staff then pushOwner to list
    // Recursively call this function for each children
    item._members = [];
    this.pushOwner(item, item._members, true);

    this.items
      .filter((i) => i.IDParent === item.Id)
      .forEach((child) => {
        this.getAllChildrenHasOwner(child);
        this.pushOwner(child, item._members);
      });
  }

  pushOwner(item, owners, mainOwner = false) {
    //check if owner not exist then push
    if (item._Staff?.Id && !owners.find((d) => d.Id == item._Staff.Id)) {
      owners.push({
        Id: item._Staff.Id,
        Code: item._Staff.Code,
        FullName: item._Staff.FullName,
        _avatar: environment.staffAvatarsServer + item._Staff.Code + '.jpg',
        _mainOwner: mainOwner,
      });
    }
  }

  segmentChanged(ev: any) {
    if (this.pageConfig.isShowFeature) {
      this.toggleFeature();
    }
    if (ev.detail.value != 'addView') {
      this.view.activeView = ev.detail.value;
      this.nav();
    } else {
      setTimeout(() => {
        this.view.activeView = this.view.activeView;
      }, 1);
    }

    //check in config
    this.viewConfigActive = this.view.activeView;
    let activeView = this.viewConfig.find((d) => d.Name == this.view.activeView);
    if (activeView) this.viewConfigActive = activeView.Type;

    if (this.viewConfig) {
      let isViewBoard = this.viewConfig.find((d) => d.Name == this.view.activeView);
      if (isViewBoard) {
        let groupByInBoard: any = {
          IDProject: parseInt(this.id),
          ViewConfig: '',
        };
        groupByInBoard.ViewConfig = JSON.parse(isViewBoard?.ViewConfig);
        groupByInBoard.Id = isViewBoard?.Id;
        this.groupByConfig = groupByInBoard;
      } else {
        let groupBySpace: any = {
          Id: this.space.Id,
          IDProject: parseInt(this.id),
          ViewConfig: this.space.activeSpace.ViewConfig,
        };
        this.groupByConfig = groupBySpace;
      }
    }
  }

  addView() {
    this.pageConfig.isShowFeature = !this.pageConfig.isShowFeature;

    if (this.pageConfig.isShowFeature) {
      if (this.itemsView['Shown']) {
        const shownItems = this.itemsView['Shown'];
        shownItems.forEach((i) => {
          i.Enable = false;
        });
        this.itemsView['Hidden'].push(...shownItems);
        this.itemsView['Shown'] = [];
      }
      const view = {
        Id: 0,
        _formGroup: this.formBuilder.group({
          ViewName: ['', Validators.required],
          ViewType: ['', Validators.required],
        }),
      };
      this.editView = view;
    }
  }

  customizeView() {
    this.pageConfig.isShowFeature = !this.pageConfig.isShowFeature;

    if (this.pageConfig.isShowFeature) {
      let view = this.viewConfig.find((d) => d.Name == this.view.activeView);
      if (view) {
        const customizeView = {
          Id: view.Id,
          _formGroup: this.formBuilder.group({
            ViewName: [view.Name, Validators.required],
            ViewType: [view.Type, Validators.required],
          }),
        };
        if (view.ViewConfig) this.itemsView = JSON.parse(view.ViewConfig)?.View;
        this.editView = customizeView;
      } else {
        this.editView = null;
      }
    }
  }

  hiddenAll() {
    if (this.itemsView['Shown']) {
      const shownItems = this.itemsView['Shown'];
      shownItems.forEach((i) => {
        i.Enable = false;
      });
      this.itemsView['Hidden'].push(...shownItems);
      this.itemsView['Shown'] = [];
    }
    this.saveView(this.editView);
  }

  nav() {
    let newURL = '#/task/' + this.id + '/' + this.space.Id + '/' + this.view.activeView;
    history.pushState({}, null, newURL);
  }

  selectSpaceTask(event) {
    if (this.selectedSpaceTask) {
      if (event.Type == 'Space') {
        this.space.Id = event.IDSpace;
        this.id = null;
      } else {
        this.id = event.Id;
        this.space.Id = event.IDSpace;
      }
      this.nav();
      this.refresh();
    }
  }

  add() {
    this.openTaskModal();
  }

  onGanttOpenTask(event) {
    let parent = this.items.find((d) => d.Id == event.IDParent);
    this.openTaskModal(event.Id, parent);
  }

  viewEnable(item: any) {
    if (item) {
      item.Enable = !item.Enable;
      const targetGroup = item.Enable ? 'Shown' : 'Hidden';

      if (!this.itemsView[targetGroup]) {
        this.itemsView[targetGroup] = [];
      }
      Object.keys(this.itemsView).forEach((groupName) => {
        const group = this.itemsView[groupName];
        const index = group.indexOf(item);
        if (index !== -1) {
          group.splice(index, 1);
        }
      });

      this.itemsView[targetGroup].push(item);
    }
    this.saveView(this.editView);
  }

  doReorder(ev, groups, nameGroup) {
    groups = ev.detail.complete(groups);
    groups = groups.filter((i) => i.Group == nameGroup);
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      g.Sort = i + 1;
    }
  }

  onKanbanOpenTask(event) {
    let parent = this.items.find((d) => d.Id == event.IDParent);
    this.openTaskModalOnKanban(event, parent);
  }

  async openTaskModalOnKanban(task, parentTask = null) {
    const space = this.space;
    if (task.Id) task = this.items.find((d) => d.Id == task.Id);
    if (!task) {
      this.env.showMessage('Task not found!', 'warning');
      return;
    }

    const modal = await this.modalController.create({
      component: TaskModalPage,
      componentProps: {
        item: task,
        space: space,
        parentTask: parentTask,
      },
      cssClass: 'modal90',
    });

    await modal.present();
    const { data, role } = await modal.onWillDismiss();
    if (role == 'confirm') {
      //Process data
      this.setFormValues(data);
    }
  }

  async openTaskModal(taskId = 0, parentTask = null) {
    const space = this.space;
    const selectedSpaceTask = this.selectedSpaceTask;
    let task = this.items.find((d) => d.Id == taskId);
    if (taskId == 0) task = { Id: 0 };
    if (!task) {
      this.env.showMessage('Task not found!', 'warning');
      return;
    }

    const modal = await this.modalController.create({
      component: TaskModalPage,
      componentProps: {
        item: task,
        space: space,
        parentTask: parentTask ? parentTask : selectedSpaceTask.Type != 'Space' ? selectedSpaceTask : null,
      },
      cssClass: 'modal90',
    });

    await modal.present();
    const { data, role } = await modal.onWillDismiss();
    if (role == 'confirm') {
      //Process data
      this.setFormValues(data);
    }
  }

  autoCalculateLink() {
    this.env.publishEvent({ Code: 'app:autoCalculateLink' });
  }

  saveView(i) {
    if (!i._formGroup.valid) {
      this.env.showTranslateMessage('Please recheck information highlighted in red above', 'warning');
    } else {
      let submitItem: any = {
        Id: i.Id,
        IDProject: this.id,
        Name: i._formGroup.value.ViewName,
        Type: i._formGroup.value.ViewType,
      };
      if (i._formGroup.value.ViewType == 'Board') {
        const viewConfig = Object.entries(this.itemsView).reduce((i, [groupName, items]) => {
          i[groupName] = items.map((item) => ({
            Id: item.Id,
            Code: item.Code,
            Name: item.Name,
            Icon: item.Icon,
            Color: item.Color,
            Sort: item.Sort,
            Enable: item.Enable,
          }));
          return i;
        }, {} as { [key: string]: { Id: any; Code: string; Name: string; Icon: string; Color: string; Sort: string; Enable: string }[] });
        let obj = {
          View: viewConfig,
          GroupBy: '',
        };
        if(submitItem.Id) {
          //case edit
          let value = this.viewConfig.find((d) => d.Name == this.view.activeView);
          if (value) obj.GroupBy = JSON.parse(value.ViewConfig)?.GroupBy;
        }
        submitItem.ViewConfig = JSON.stringify(obj);
      }
      if (this.submitAttempt == false) {
        this.submitAttempt = true;
        this.viewProvider
          .save(submitItem)
          .then((result: any) => {
            this.editView.Id = result.Id;
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
}
