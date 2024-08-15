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
  statusGroupBy = []; //dataSource status

  viewConfig;
  groupByConfig;
  viewConfigActive = ''; // active View in config

  isSegmentActive: boolean = true;
  groupValue = [
    {
      Name: 'Shown',
      Fields: [],
    },
    {
      Name: 'Hidden',
      Fields: [],
    },
    {
      Name: 'Layout',
      Fields: [
        { Code: 'IsStackFields',Name: 'Stack Fields',Enable: false },
        { Code: 'IsEmptyFields', Name: 'Show Empty Fields', Enable: false },
        { Code: 'IsCollapseEmptyColumns', Name: 'Collapse Empty Columns', Enable: false },
        { Code: 'IsColorColumns', Name: 'Color Columns', Enable: false },
      ],
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
          
          this.groupValue.forEach((group) => {
            if (group.Name == 'Hidden') {
              group.Fields.push(...viewData);
            }
          });

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

    //loaded View config
    let promises = [this.viewProvider.read({ IDProject: this.id })]; //
    if (this.items.length) {
      promises.push(
        this.taskLinkService.read({
          Source: JSON.stringify(this.items.map((d) => d.Id)),
          Target: JSON.stringify(this.items.map((d) => d.Id)),
        }),
      );
    }
    //reload this.space.activeSpace if change
    if (this.groupByConfig?.SpaceViewActive) {
      promises.push(this.spaceProvider.read());
    }

    if (this.space.Id) {
      promises.push(this.spaceStatusProvider.read({ IDSpace: this.space.Id }));
    }

    Promise.all(promises).then((values: any) => {
      if (values[0].data) {
        this.viewConfig = values[0].data;
        // Check is 'view' or 'space'
        this.viewConfigActive = this.view.activeView;
        let activeView = this.viewConfig.find((d) => {
          const viewConfig = JSON.parse(d.ViewConfig)?.Layout.View.Name;
          return viewConfig == this.view.activeView;
        });
        if (activeView) this.viewConfigActive = JSON.parse(activeView.ViewConfig)?.Layout.View.Type;
      }
      let indexPromises = 1;
      this.items.forEach((i) => {
        i._isRoot = i.IDParent == null || i.Id == this.id;
        i._Type = this.typeList.find((d) => d.Code == i.Type);

        if (i._isRoot) {
          this.getAllChildrenHasOwner(i);
        }
      });

      if (this.items.length) {
        this.linksData = values[indexPromises].data;
        indexPromises++;
      }

      if (this.groupByConfig?.SpaceViewActive) {
        this.space.spaceList = values[indexPromises].data;
        indexPromises++;
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

            let addViewConfig = this.viewConfig.map((item: any) => { 
              const value = JSON.parse(item.ViewConfig)?.Layout.View;
              return {
                Code: value.Name || '',
                Name: value.Name || ''
              };
            });
            

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

          //get status list in space
          this.space.statusList = values[indexPromises].data;

          // Check is 'view' or 'space'
          let isView = values[0].data.find((d) =>{
            const viewConfig = JSON.parse(d.ViewConfig)?.Layout.View.Name;
            return viewConfig == this.view.activeView;
          });
          if (isView) {
            //custom view
            groupBy.ViewConfig = JSON.parse(isView?.ViewConfig);
            groupBy.Id = isView?.Id;
          } else {
            //space

            const jsonSpace = JSON.parse(this.space.activeSpace.ViewConfig) || {};
            let configSpace = jsonSpace.map(item => ({
              Code: item.Code,
              Name: item.Name,
              Layout: {
                View: { Name: item.Code, Type: item.Code,Icon: '',Color: '',IsPinned: false,IsDefault: false},
                Card: {IsStackFields: false,IsEmptyFields: false,IsCollapseEmptyColumns: false,IsColorColumns: false,Size: 'Medium'},
              },
              Fields: [{Code: '',Name: '',Icon: '',Color: '',Sort: ''}],
              GroupBy: {
                Group1: {Code: '',Sort: ''},
                Group2: null
              },
              Filter: [],
              Sort: [],
            }));
            // check exist config
            let check = jsonSpace.find(d => d.Code == this.view.activeView);
            if(check?.Layout) {
              configSpace = jsonSpace;
              groupBy.Id = this.space.Id;
              groupBy.IDProject = parseInt(this.id);
              groupBy.SpaceViewActive = this.view.activeView;
              groupBy.ViewConfig = configSpace;
            }else {
              //case view after update
              let viewAfterUpdate = values[0].data.find((d) =>{
                const viewConfig = JSON.parse(d.ViewConfig)?.Layout.View.Name;
                return this.view.viewList.find(i => i.Code == viewConfig);
              });
              if(viewAfterUpdate) {
                groupBy.ViewConfig = JSON.parse(viewAfterUpdate.ViewConfig);
                groupBy.Id = viewAfterUpdate.Id;
              }
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
      .filter((i) => i.IDParent == item.Id)
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

    this.isSegmentActive = false;
    setTimeout(() => {
      this.isSegmentActive = true;
    }, 50);

    // Check is 'view' or 'space'
    this.viewConfigActive = this.view.activeView;
    let activeView = this.viewConfig.find((d) => {
      const viewConfig = JSON.parse(d.ViewConfig)?.Layout.View.Name;
      return viewConfig == this.view.activeView;
      
    });
    if (activeView) this.viewConfigActive = JSON.parse(activeView.ViewConfig)?.Layout.View.Type;

    if (this.viewConfig) {

      if (activeView) {
        let groupByInBoard: any = {
          IDProject: parseInt(this.id),
          ViewConfig: '',
        };
        groupByInBoard.ViewConfig = JSON.parse(activeView?.ViewConfig);
        groupByInBoard.Id = activeView?.Id;
        this.groupByConfig = groupByInBoard;
      } else {

        const jsonSpace = JSON.parse(this.space.activeSpace.ViewConfig) || {};
        let configSpace = jsonSpace.map(item => ({
          Code: item.Code,
          Name: item.Name,
          Layout: {
            View: { Name: item.Code, Type: item.Code,Icon: '',Color: '',IsPinned: false,IsDefault: false},
            Card: {IsStackFields: false,IsEmptyFields: false,IsCollapseEmptyColumns: false,IsColorColumns: false,Size: 'Medium',},
          },
          Fields: [{Code: '',Name: '',Icon: '',Color: '',Sort: ''
          }],
          GroupBy: {
            Group1: {Code: '',Sort: ''},
            Group2: null
          },
          Filter: [],
          Sort: [],
        }));
        // check exist config
        let check = jsonSpace.find(d => d.Code == this.view.activeView);
        if(check.Layout) {
          configSpace = jsonSpace;
        }
        let groupBySpace: any = {
          Id: this.space.Id,
          IDProject: parseInt(this.id),
          SpaceViewActive: this.view.activeView,
          ViewConfig: configSpace,
        };
        this.groupByConfig = groupBySpace;
      }
    }
  }

  customizeView(type) {
    this.pageConfig.isShowFeature = !this.pageConfig.isShowFeature;

    if (this.pageConfig.isShowFeature) {
      if (type == 'add') {
        // add
        const groupValue = this.groupValue.map(group => {
          if (group.Name == 'Hidden') {
            //Hidden
            const shownItems = this.groupValue.find(g => g.Name == 'Shown')?.Fields || [];
            shownItems.forEach(item => item.Enable = false);
            return {
              ...group,
              Fields: [
                ...group.Fields,
                ...shownItems
              ]
            };
          } else if (group.Name == 'Shown') {
            //Shown
            return {
              Name: 'Shown', 
              Fields: [] 
            };
          } else {
            // Layout
            const layoutItems = group.Fields.map(item => ({
              ...item,
              Enable: false
            }));
            return {
              ...group,
              Fields: layoutItems
            };
          }
        });
        this.groupValue = groupValue;
        const view = {
          Id: 0,
          _formGroup: this.formBuilder.group({
            ViewName: ['', Validators.required],
            ViewType: ['', Validators.required],
          }),
        };
        this.editView = view;
      } else {
        // edit
        let view = this.viewConfig.find((d) => {
          const viewConfig = JSON.parse(d.ViewConfig)?.Layout.View.Name;
          return viewConfig == this.view.activeView;
        });
        if (view) {
          let value = JSON.parse(view.ViewConfig);
          const customizeView = {
            Id: view.Id,
            _formGroup: this.formBuilder.group({
              ViewName: [value.Layout.View.Name, Validators.required],
              ViewType: [value.Layout.View.Type, Validators.required],
            }),
          };
          const shownGroup = this.groupValue.find(g => g.Name == 'Shown');
          const hiddenGroup = this.groupValue.find(g => g.Name == 'Hidden');
          const layoutGroup = this.groupValue.find(g => g.Name == 'Layout');
          const updateFields = (group) => {
            if (group && group.Fields.length > 0) {
              value.Fields.forEach(field => {
                const existingField: any = group.Fields.find(f => f.Code == field.Code);
                if (existingField) {
                  //update Name, Icon, Color
                  existingField.Color = field.Color;
                  existingField.Icon = field.Icon;
                  existingField.Name = field.Name;
                  existingField.Enable = true;
                    // Add to Shown
                    if (!shownGroup.Fields.find(f => f.Code == field.Code)) {
                      shownGroup.Fields.push(existingField);
                    }
                    // Remove from Hidden
                    hiddenGroup.Fields = hiddenGroup.Fields.filter(f => f.Code !== field.Code);
                  
                }
              });
            }
          };
          const updateLayoutFields = (group) => {
            if (group && group.Fields.length > 0 && value.Layout && value.Layout.Card) {
              Object.keys(value.Layout.Card).forEach(cardKey => {
                const layoutField = group.Fields.find(f => f.Code == cardKey);
                if (layoutField) {
                  // Enable or disable based on Layout.Card value
                  layoutField.Enable = value.Layout.Card[cardKey];

                }
              });
            }
          };
          updateFields(shownGroup);
          updateFields(hiddenGroup);
          updateLayoutFields(layoutGroup);
          
          this.editView = customizeView;
        } else {
          let space = JSON.parse(this.space.activeSpace.ViewConfig);
          let value = space.find(d => d.Code == this.view.activeView);
          if(value.Layout) {
            // case exist config
            const customizeView = {
              Id: this.space.Id,
              _formGroup: this.formBuilder.group({
                ViewName: [value.Layout.View.Name, Validators.required],
                ViewType: [value.Layout.View.Type, Validators.required],
              }),
            };
            const shownGroup = this.groupValue.find(g => g.Name == 'Shown');
            const hiddenGroup = this.groupValue.find(g => g.Name == 'Hidden');
            const layoutGroup = this.groupValue.find(g => g.Name == 'Layout');
            const updateFields = (group) => {
              if (group && group.Fields.length > 0) {
                value.Fields.forEach(field => {
                  const existingField: any = group.Fields.find(f => f.Code == field.Code);
                  if (existingField) {
                    //update Name, Icon, Color
                    existingField.Color = field.Color;
                    existingField.Icon = field.Icon;
                    existingField.Name = field.Name;
                    existingField.Enable = true;
                      // Add to Shown
                      if (!shownGroup.Fields.find(f => f.Code == field.Code)) {
                        shownGroup.Fields.push(existingField);
                      }
                      // Remove from Hidden
                      hiddenGroup.Fields = hiddenGroup.Fields.filter(f => f.Code !== field.Code);
                    
                  }
                });
              }
            };
           
  
            const updateLayoutFields = (group) => {
              if (group && group.Fields.length > 0 && value.Layout && value.Layout.Card) {
                Object.keys(value.Layout.Card).forEach(cardKey => {
                  const layoutField = group.Fields.find(f => f.Code == cardKey);
                  if (layoutField) {
                    // Enable or disable based on Layout.Card value
                    layoutField.Enable = value.Layout.Card[cardKey];
  
                  }
                });
              }
            };
            updateFields(shownGroup);
            updateFields(hiddenGroup);
            updateLayoutFields(layoutGroup);
            
            this.editView = customizeView;
          }else {
            // case config
            const groupValue = this.groupValue.map(group => {
              if (group.Name == 'Hidden') {
                //Hidden
                const shownItems = this.groupValue.find(g => g.Name == 'Shown')?.Fields || [];
                shownItems.forEach(item => item.Enable = false);
                return {
                  ...group,
                  Fields: [
                    ...group.Fields,
                    ...shownItems
                  ]
                };
              } else if (group.Name == 'Shown') {
                //Shown
                return {
                  Name: 'Shown', 
                  Fields: [] 
                };
              } else {
                // Layout
                const layoutItems = group.Fields.map(item => ({
                  ...item,
                  Enable: false
                }));
                return {
                  ...group,
                  Fields: layoutItems
                };
              }
            });
          
            this.groupValue = groupValue;
            
            const view = {
              Id: this.space.Id,
              _formGroup: this.formBuilder.group({
                ViewName: [value.Name, Validators.required],
                ViewType: [value.Name, Validators.required],
              }),
            };
            this.editView = view;
          }

        }
      }
    }
  }

  hiddenAll() {
    const groupValue = this.groupValue.map(group => {
      if (group.Name == 'Hidden') {
        //Hidden
        const shownItems = this.groupValue.find(g => g.Name == 'Shown')?.Fields || [];
        shownItems.forEach(item => item.Enable = false);
        return {
          ...group,
          Fields: [
            ...group.Fields,
            ...shownItems
          ]
        };
      } else if (group.Name == 'Shown') {
        //Shown
        return {
          Name: 'Shown', 
          Fields: [] 
        };
      } else {
        // Layout
        return group;
      }
    });
  
    this.groupValue = groupValue;
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
    if (!item) {
      return;
    }
    const layoutCode = ['IsStackFields', 'IsEmptyFields', 'IsCollapseEmptyColumns', 'IsColorColumns'];
    item.Enable = !item.Enable;
    if (layoutCode.includes(item.Code)) {
      this.saveView(this.editView);
      return;
    }

    const group = item.Enable ? 'Shown' : 'Hidden';
    const targetGroup = this.groupValue.find(g => g.Name == group);
    const currentGroup = this.groupValue.find(g => g.Name == (item.Enable ? 'Hidden' : 'Shown'));

    //remove
    if (currentGroup) {
      const index = currentGroup.Fields.findIndex(g => g.Code == item.Code);
      if (index !== -1) {
        currentGroup.Fields.splice(index, 1);
      }
    }
    //add
    if (targetGroup) {
      targetGroup.Fields.push(item);
    }
    
    //save
    this.saveView(this.editView);
  }
  
  
  

  doReorder(ev: any, fields: any[], nameGroup: string) {
    const reorderedFields = ev.detail.complete(fields);
  
    reorderedFields.forEach((item, index) => {
      item.Sort = index + 1;
      item.Group = nameGroup;
    });

    this.groupValue[0].Fields = reorderedFields
    this.saveView(this.editView);
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
    //config template
    let config = {
      Layout: {
        View: { Name: '', Type: '', Icon: '', Color: '', IsPinned: false, IsDefault: false },
        Card: {
          IsStackFields: false,
          IsEmptyFields: false,
          IsCollapseEmptyColumns: false,
          IsColorColumns: false,
          Size: 'Medium',
        }, // size set width card
      },
      Fields: [{ Code: '', Name: '', Icon: '', Color: '', Sort: '' }], // Fields enable
      GroupBy: { Group1: { Code: '', Sort: '' }, Group2: null },
      Filter: [],
      Sort: [],
    };

    if (!i._formGroup.valid) {
      this.env.showMessage('Please recheck information highlighted in red above', 'warning');
    } else {
      let submitItem: any = {
        Id: i.Id,
        IDProject: this.id,
      };
      config.Layout.View.Name = i._formGroup.value.ViewName;
      config.Layout.View.Type = i._formGroup.value.ViewType;
      if (i._formGroup.value.ViewType == 'Board') {
        config.Fields = this.groupValue.find(g => g.Name == 'Shown').Fields.map((field: any) => ({
          Code: field.Code || '',
          Name: field.Name || '',
          Icon: field.Icon || '',
          Color: field.Color || '',
          Sort: field.Sort || ''
        }));
        const layoutGroup = this.groupValue.find(g => g.Name == 'Layout').Fields;
        layoutGroup.forEach((field: any) => {
          if (field.Enable) {
            switch (field.Code) {
              case 'IsStackFields':
                config.Layout.Card.IsStackFields = true;
                break;
              case 'IsEmptyFields':
                config.Layout.Card.IsEmptyFields = true;
                break;
              case 'IsCollapseEmptyColumns':
                config.Layout.Card.IsCollapseEmptyColumns = true;
                break;
              case 'IsColorColumns':
                config.Layout.Card.IsColorColumns = true;
                break;
            }
          }
        });
      }
      
      if (this.submitAttempt == false) {
        this.submitAttempt = true;
        let isView = this.viewConfig.find((d) =>{
          const viewConfig = JSON.parse(d.ViewConfig)?.Layout.View.Name;
          return viewConfig == this.view.activeView;
        });
        if(isView) {
          submitItem.ViewConfig = JSON.stringify(config);
          this.viewProvider
            .save(submitItem)
            .then((result: any) => {
              this.editView.Id = result.Id;
              this.env.showMessage('View saved', 'success');
              this.submitAttempt = false;
              this.loadedData();
              //change name, type
              let activeView = this.viewConfig.find((d) => d.Id == result.Id);
              if (activeView) {
                //update
                activeView.Name = result.Name;
                activeView.Type = result.Type;
              } else {
                this.viewConfig.push(result);
              }
            })
            .catch((err) => {
              this.env.showMessage('Cannot save, please try again', 'danger');
              this.submitAttempt = false;
          });
        }else {
          let spaceValue = JSON.parse(this.space.activeSpace.ViewConfig);
          let configSpace = spaceValue.map(item => {
            if (item.Code == this.view.activeView) {
              
              return {
                Code: item.Code,
                Name: item.Name,
                ...config,
              };
            }
            return item;
          });
          submitItem.ViewConfig = JSON.stringify(configSpace);

          this.spaceProvider
            .save(submitItem)
            .then((result: any) => {
              this.editView.Id = result.Id;
              this.env.showMessage('View saved', 'success');
              this.submitAttempt = false;
              this.loadedData();
              //change name, type
              let activeView = this.viewConfig.find((d) => d.Id == result.Id);
              if (activeView) {
                //update
                activeView.Name = result.Name;
                activeView.Type = result.Type;
              } else {
                this.viewConfig.push(result);
              }
            })
            .catch((err) => {
              this.env.showMessage('Cannot save, please try again', 'danger');
              this.submitAttempt = false;
          });
        }
      }
    }
  }
}
