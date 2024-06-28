import { Component, Type, ViewEncapsulation } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import {
  PM_SpaceProvider,
  PM_SpaceStatusProvider,
  PM_TaskLinkProvider,
  PM_TaskProvider,
} from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { TaskModalPage } from '../task-modal/task-modal.page';

import { environment } from 'src/environments/environment';
import { lib } from 'src/app/services/static/global-functions';
import { ActivatedRoute, Router } from '@angular/router';

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
  space = { Id: null, Name: '', statusList: [], activeSapce: null, spaceList: [] };
  view = { activeView: '', viewList: [] };

  typeList = [];
  spaceTreeList = []; // Header space stree data source
  selectedSpaceTask;

  listParent;
  linksData;

  taskList;

  constructor(
    public pageProvider: PM_TaskProvider,
    public spaceProvider: PM_SpaceProvider,
    public spaceStatusProvider: PM_SpaceStatusProvider,
    public taskLinkService: PM_TaskLinkProvider,
    public navCtrl: NavController,
    public route: ActivatedRoute,
    public modalController: ModalController,
    public popoverCtrl: PopoverController,
    public alertCtrl: AlertController,
    public loadingController: LoadingController,
    public env: EnvService,
    public location: Location,
    router: Router,
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
      if (this.space.activeSapce) this.refresh();
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

      Promise.all([this.spaceProvider.read(), this.pageProvider.read(query)]).then((values: any) => {
        this.space.spaceList = values[0].data;
        let taskList = values[1].data;

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
      });
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

    if (this.space.Id) {
      this.space.activeSapce = this.space.spaceList.find((d) => d.Id == this.space.Id);
      if (this.space.activeSapce) {
        this.space.Name = this.space.activeSapce.Name;

        this.view.viewList = JSON.parse(this.space.activeSapce.ViewConfig) || [];
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
      } else {
        this.env.showMessage('Space not found!', 'warning');
      }
    } else {
      this.view.viewList = [];
    }
    let selectedSpaceTask = this.spaceTreeList.find((d) => d.Id == this.id);
    if (!selectedSpaceTask) selectedSpaceTask = this.spaceTreeList.find((d) => d.IDSpace == this.space.Id);
    if (selectedSpaceTask != this.selectedSpaceTask) this.selectedSpaceTask = selectedSpaceTask;
    super.loadedData(event, ignoredFromGroup);
  }

  getAllChildrenHasOwner(item) {
      // Set item._members list
      // Check if item has _Staff then pushOwner to list
      // Recursively call this function for each children
      item._members = [];
      this.pushOwner(item, item._members, true);
      
      this.items.filter((i) => i.IDParent === item.Id).forEach((child) => {
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
    }
    else{
      setTimeout(() => {
        this.view.activeView = this.view.activeView;
      }, 1);
    }
    
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
}
