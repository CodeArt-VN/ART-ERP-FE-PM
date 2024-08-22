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
  view = { activeView:{  Name: '', Type: '', From: '', Sort: 0 } , viewList: [] };

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
  schemaOriginal;

  activeViewIndex;

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
      this.view.activeView.Name = param.get('view') != 'null' ? param.get('view') : null;
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
          this.schemaOriginal = [...this.groupValue];
          this.schemaOriginal.forEach((group) => {
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
    this.id = this.id == "null" ? null : this.id;
    let promises = [this.viewProvider.read({ IDProject: this.id })]; //
    if (this.items.length) {
      promises.push(
        this.taskLinkService.read({
          Source: JSON.stringify(this.items.map((d) => d.Id)),
          Target: JSON.stringify(this.items.map((d) => d.Id)),
        }),
      );
    }
    
    if (this.groupByConfig?.SpaceView) {
      promises.push(this.spaceProvider.read());
    }

    if (this.space.Id) {
      promises.push(this.spaceStatusProvider.read({ IDSpace: this.space.Id }));
    }

    Promise.all(promises).then((values: any) => {
      if (values[0].data) {
        this.viewConfig = values[0].data[0];
        
        if(this.viewConfig) {
          this.viewConfig.ViewConfig = JSON.parse(values[0].data[0].ViewConfig);
        } 
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

      if (this.groupByConfig?.SpaceView) {
        this.space.spaceList = values[indexPromises].data;
        indexPromises++;
      }

      if (this.space.Id) {
        this.space.activeSpace = this.space.spaceList.find((d) => d.Id == this.space.Id);
        if (this.space.activeSpace) {
          this.space.Name = this.space.activeSpace.Name;
          const viewConfig = JSON.parse(this.space.activeSpace.ViewConfig) || {};
          this.view.viewList = viewConfig.Views
            .filter(view => view.Layout.View.IsActive)
            .map(view => ({
              Type: view.Layout.View.Type,
              Name: view.Layout.View.Name,
              From: "Space",
              Sort: view.Sort
            }));
          
          if (this.viewConfig) {

            let addViewConfig = this.viewConfig.ViewConfig.Views.map((item: any) => { 
              return {
                Type: item.Layout.View.Type || '',
                Name: item.Layout.View.Name || '',
                From: "View",
                Sort: item.Sort
              };
            });
            

            this.view.viewList = [...this.view.viewList, ...addViewConfig];
          }
          let defaultView = this.view.viewList.find((d) => d.Default);
          if (!defaultView && this.view.viewList.length) defaultView = this.view.viewList[0];

          if (!this.view.activeView.Name) {
            if (defaultView) {
              this.view.activeView.Name = defaultView?.Code;
            } else {
              this.env.showMessage('No view found, please check space config', 'warning');
            }
          }

          //get status list in space
          this.space.statusList = values[indexPromises].data;

          // Check is 'view' or 'space'
          if(this.view.activeView.From == "") {
            this.view.activeView = this.view.viewList.find(d => d.Name == this.view.activeView.Name);
            if(!this.view.activeView) {
              this.env.showMessage('View not found!', 'warning');
              this.pageConfig.showSpinner = false;
            return 
            }
          }
          if (this.viewConfig) {
            
            let activeView = this.viewConfig.ViewConfig.Views.find((d) => {
              return (
                d.Layout.View.Name == this.view.activeView.Name &&
                d.Layout.View.Type == this.view.activeView.Type &&
                d.Sort[0] == this.view.activeView.Sort[0]
              );
            });

            if (activeView) {
              let groupByInBoard: any = {
                IDProject: parseInt(this.id),
                ViewConfig: '',
                ActiveView: this.view.activeView
              };
              groupByInBoard.ViewConfig = this.viewConfig.ViewConfig.Views;
              groupByInBoard.Id = this.viewConfig.Id;
              this.groupByConfig = groupByInBoard;
            } else {
      
              const jsonSpace = JSON.parse(this.space.activeSpace.ViewConfig) || {};
              let configSpace = jsonSpace.Views.map((item: any) => {
                const fields = item.Fields ?? [{Code: '',Name: '',Icon: '',Color: '',Sort: ''}]
                return {
                  Layout: {
                    View: { Name: item.Layout.View.Name, Type: item.Layout.View.Type, Icon: '', Color: '', IsPinned: item.Layout.View.IsPinned || false, IsDefault: item.Layout.View.IsDefault || false, IsActive: item.Layout.View.IsActive || false },
                    Card: { IsStackFields: item?.Layout?.Card?.IsStackFields || false, IsEmptyFields: item?.Layout?.Card?.IsEmptyFields || false, IsCollapseEmptyColumns: item?.Layout?.Card?.IsCollapseEmptyColumns || false, IsColorColumns: item?.Layout?.Card?.IsColorColumns || false, Size: 'Medium'},
                  },
                  Fields: fields,
                  GroupBy: {
                    Group1: {Code: item?.GroupBy?.Group1?.Code || '',Sort: item?.GroupBy?.Group1?.Sort || ''},
                    Group2: {Code: item?.GroupBy?.Group2?.Code || '',Sort: item?.GroupBy?.Group2?.Sort || ''}
                  },
                  Filter: [],
                  Sort: [item.Sort[0]],
                };
              });
              
              let groupBySpace: any = {
                Id: this.space.Id,
                IDProject: parseInt(this.id),
                SpaceView: this.view.activeView.Name,
                ViewConfig: configSpace,
                ActiveView: this.view.activeView
              };
              this.groupByConfig = groupBySpace;
            }
            
          }else {
            const jsonSpace = JSON.parse(this.space.activeSpace.ViewConfig) || {};
              let configSpace = jsonSpace.Views.map((item: any) => {
                const fields = item.Fields ?? [{Code: '',Name: '',Icon: '',Color: '',Sort: ''}]
                return {
                  Layout: {
                    View: { Name: item.Layout.View.Name, Type: item.Layout.View.Type, Icon: '', Color: '', IsPinned: item.Layout.View.IsPinned || false, IsDefault: item.Layout.View.IsDefault || false, IsActive: item.Layout.View.IsActive || false },
                    Card: { IsStackFields: item?.Layout?.Card?.IsStackFields || false, IsEmptyFields: item?.Layout?.Card?.IsEmptyFields || false, IsCollapseEmptyColumns: item?.Layout?.Card?.IsCollapseEmptyColumns || false, IsColorColumns: item?.Layout?.Card?.IsColorColumns || false, Size: 'Medium'},
                  },
                  Fields: fields,
                  GroupBy: {
                    Group1: {Code: item?.GroupBy?.Group1?.Code || '',Sort: item?.GroupBy?.Group1?.Sort || ''},
                    Group2: {Code: item?.GroupBy?.Group2?.Code || '',Sort: item?.GroupBy?.Group2?.Sort || ''}
                  },
                  Filter: [],
                  Sort: [item.Sort[0]],
                };
              });
              
              let groupBySpace: any = {
                Id: this.space.Id,
                IDProject: parseInt(this.id),
                SpaceView: this.view.activeView.Name,
                ViewConfig: configSpace,
                ActiveView: this.view.activeView
              };
              this.groupByConfig = groupBySpace;
          }
        } else {
          this.env.showMessage('Space not found!', 'warning');
        }
        const activeViewIndex = this.view.viewList.findIndex(d => d.Name === this.view.activeView.Name);
        this.activeViewIndex = activeViewIndex;
        
      } else {
        this.view.viewList = [];
      }

      let selectedSpaceTask = this.spaceTreeList.find((d) => d.Id == this.id);
      if (!selectedSpaceTask) selectedSpaceTask = this.spaceTreeList.find((d) => d.IDSpace == this.space.Id);
      if (selectedSpaceTask != this.selectedSpaceTask) this.selectedSpaceTask = selectedSpaceTask;

      this.isSegmentActive = false;
      setTimeout(() => {
        this.isSegmentActive = true;
      }, 50);
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

  segmentChanged(event: any) {
    if (this.pageConfig.isShowFeature) {
      this.toggleFeature();
    }
    if (event.detail.value != 'addView') {
      const selectedIdx = event.detail.value;
      const selectedView = this.view.viewList[selectedIdx];
  

      this.view.activeView = {
        Name: selectedView.Name,
        Type: selectedView.Type,
        From: selectedView.From,
        Sort: selectedView.Sort
      };
  
      this.nav();
    } else {
      setTimeout(() => {
        this.view.activeView.Name = this.view.activeView.Name;
      }, 1);
    }

    this.isSegmentActive = false;
    setTimeout(() => {
      this.isSegmentActive = true;
    }, 50);

    if (this.viewConfig) {

      let activeView = this.viewConfig.ViewConfig.Views.find((d) => {
        return (
          d.Layout.View.Name == this.view.activeView.Name &&
          d.Layout.View.Type == this.view.activeView.Type &&
          d.Sort[0] == this.view.activeView.Sort[0]
        );
      });
  
      if (activeView) {
        let groupByInBoard: any = {
          IDProject: parseInt(this.id),
          ViewConfig: '',
          ActiveView: this.view.activeView
        };
        groupByInBoard.ViewConfig = this.viewConfig.ViewConfig.Views;
        groupByInBoard.Id = this.viewConfig.Id;
        this.groupByConfig = groupByInBoard;
      } else {

        const jsonSpace = JSON.parse(this.space.activeSpace.ViewConfig) || {};
        let configSpace = jsonSpace.Views.map((item) => {
          const fields = item.Fields ?? [{Code: '',Name: '',Icon: '',Color: '',Sort: ''}]
          return {
          Layout: {
            View: { Name: item.Layout.View.Name, Type: item.Layout.View.Type, Icon: '', Color: '', IsPinned: item.Layout.View.IsPinned || false, IsDefault: item.Layout.View.IsDefault || false, IsActive: item.Layout.View.IsActive || false},
            Card: { IsStackFields: item?.Layout?.Card?.IsStackFields || false, IsEmptyFields: item?.Layout?.Card?.IsEmptyFields || false, IsCollapseEmptyColumns: item?.Layout?.Card?.IsCollapseEmptyColumns || false, IsColorColumns: item?.Layout?.Card?.IsColorColumns || false, Size: item?.Layout?.Card?.Size || 'Medium'},
          },
          Fields: fields,
          GroupBy: {
            Group1: {Code: item?.GroupBy?.Group1?.Code || '',Sort: item?.GroupBy?.Group1?.Sort || ''},
            Group2: {Code: item?.GroupBy?.Group2?.Code || '',Sort: item?.GroupBy?.Group2?.Sort || ''}
          },
          Filter: [],
          Sort: [item.Sort[0]],
          }
        });
        let groupBySpace: any = {
          Id: this.space.Id,
          IDProject: parseInt(this.id),
          SpaceView: this.view.activeView.Name,
          ViewConfig: configSpace,
          ActiveView: this.view.activeView
        };
        this.groupByConfig = groupBySpace;
      }
    }else {
      const jsonSpace = JSON.parse(this.space.activeSpace.ViewConfig) || {};
              let configSpace = jsonSpace.Views.map((item: any) => {
                const fields = item.Fields ?? [{Code: '',Name: '',Icon: '',Color: '',Sort: ''}]
                return {
                  Layout: {
                    View: { Name: item.Layout.View.Name, Type: item.Layout.View.Type, Icon: '', Color: '', IsPinned: item.Layout.View.IsPinned || false, IsDefault: item.Layout.View.IsDefault || false, IsActive: item.Layout.View.IsActive || false },
                    Card: { IsStackFields: item?.Layout?.Card?.IsStackFields || false, IsEmptyFields: item?.Layout?.Card?.IsEmptyFields || false, IsCollapseEmptyColumns: item?.Layout?.Card?.IsCollapseEmptyColumns || false, IsColorColumns: item?.Layout?.Card?.IsColorColumns || false, Size: 'Medium'},
                  },
                  Fields: fields,
                  GroupBy: {
                    Group1: {Code: item?.GroupBy?.Group1?.Code || '',Sort: item?.GroupBy?.Group1?.Sort || ''},
                    Group2: {Code: item?.GroupBy?.Group2?.Code || '',Sort: item?.GroupBy?.Group2?.Sort || ''}
                  },
                  Filter: [],
                  Sort: [item.Sort[0]],
                };
              });
              
              let groupBySpace: any = {
                Id: this.space.Id,
                IDProject: parseInt(this.id),
                SpaceView: this.view.activeView.Name,
                ViewConfig: configSpace,
                ActiveView: this.view.activeView
              };
              this.groupByConfig = groupBySpace;
    }
  }

  customizeView(type) {
    this.pageConfig.isShowFeature = !this.pageConfig.isShowFeature;
    this.groupValue = [...this.schemaOriginal];
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
        let view = this.viewConfig?.ViewConfig?.Views?.find((d) => {
          return (
            d.Layout.View.Name == this.view.activeView.Name &&
            d.Layout.View.Type == this.view.activeView.Type &&
            d.Sort[0] == this.view.activeView.Sort[0]
          );
        });
        if (view) {
          const customizeView = {
            Id: this.viewConfig.Id,
            _formGroup: this.formBuilder.group({
              ViewName: [view.Layout.View.Name, Validators.required],
              ViewType: [view.Layout.View.Type, Validators.required],
            }),
          };
          const shownGroup = this.groupValue.find(g => g.Name == 'Shown');
          const hiddenGroup = this.groupValue.find(g => g.Name == 'Hidden');
          const layoutGroup = this.groupValue.find(g => g.Name == 'Layout');
          const updateFields = (group) => {
            if (group && group.Fields.length > 0) {
              view.Fields.forEach(field => {
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
              shownGroup.Fields = shownGroup.Fields.filter(field => {
                const isInViewFields = view.Fields.some(viewField => viewField.Code == field.Code);
                if (!isInViewFields) {
                  field.Enable = false;
                  hiddenGroup.Fields.push(field);
                  return false; // Remove from shownGroup
                }
                return true; // Keep in shownGroup
              });
            }
          };
          const updateLayoutFields = (group) => {
            if (group && group.Fields.length > 0 && view.Layout && view.Layout.Card) {
              Object.keys(view.Layout.Card).forEach(cardKey => {
                const layoutField = group.Fields.find(f => f.Code == cardKey);
                if (layoutField) {
                  // Enable or disable based on Layout.Card value
                  layoutField.Enable = view.Layout.Card[cardKey];

                }
              });
            }
          };
          updateFields(shownGroup);
          updateFields(hiddenGroup);
          updateLayoutFields(layoutGroup);
          if(view.Fields.length == 0) {
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
          }
          this.editView = customizeView;
        } else {
          let space = JSON.parse(this.space.activeSpace.ViewConfig);
          let value = space.Views.find(d => d.Layout.View.Name == this.view.activeView.Name);
          if(value.Fields) {
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
                shownGroup.Fields = shownGroup.Fields.filter(field => {
                  const isInViewFields = value.Fields.some(viewField => viewField.Code == field.Code);
                  if (!isInViewFields) {
                    field.Enable = false;
                    hiddenGroup.Fields.push(field);
                    return false; // Remove from shownGroup
                  }
                  return true; // Keep in shownGroup
                });
              }
            };
           
  
            const updateLayoutFields = (group) => {
              if (group && group.Fields.length > 0 && value.Layout && value.Layout.Card) {
                Object.keys(value.Layout.Card).forEach(cardKey => {
                  const layoutField = group.Fields.find(f => f.Code == cardKey);
                  if (layoutField) {
                    layoutField.Enable = value.Layout.Card[cardKey];
                  }
                });
              }
            };
            updateFields(shownGroup);
            updateFields(hiddenGroup);
            updateLayoutFields(layoutGroup);
            if(value.Fields.length == 0) {
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
            }
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
                ViewName: [value.Layout.View.Name, Validators.required],
                ViewType: [value.Layout.View.Type, Validators.required],
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
    let newURL = '#/task/' + this.id + '/' + this.space.Id + '/' + this.view.activeView.Name;
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
    const groupUpdate = this.groupValue.find(g => g.Name == 'Shown');
    if (groupUpdate) {
      groupUpdate.Fields = reorderedFields;
    }
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
    let config : any = {
      Layout: {
        View: { Name: '', Type: '', Icon: '', Color: '', IsPinned: false, IsDefault: false, IsActive: false },
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
     
      config.Layout.View.Name = i._formGroup.value.ViewName;
      config.Layout.View.Type = i._formGroup.value.ViewType;
      config.Layout.View.IsActive = true;
      config.Sort = this.view.activeView.Sort;
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
        let submitItem: any = {
          Id: i.Id,
        };
       
        let isView = this.viewConfig?.ViewConfig?.Views?.find((d) =>{
          return (
            d.Layout.View.Name == this.view.activeView.Name &&
            d.Layout.View.Type == this.view.activeView.Type &&
            d.Sort[0] == this.view.activeView.Sort[0]
          );
        });

        
        if(isView || (isView && this.id)) {
          if(!submitItem.Id) {
            submitItem.Id = this.viewConfig.Id;
            const existViews = this.viewConfig?.ViewConfig?.Views || [];
            let newSortPosition = existViews.length > 0 ? Math.max(...existViews.map(view => view.Sort || 0)) + 1 : 1;
            config.Sort = [newSortPosition];
            submitItem.ViewConfig = JSON.stringify({
              Views: [...existViews, config]
            });
          }else {
            const existViews = this.viewConfig?.ViewConfig?.Views || [];
            const updatedViews = existViews.map(view => {
              if (view.Layout.View.Type == config.Layout.View.Type && view.Sort[0] == config.Sort[0]) {

                const updatedView = { 
                  ...view, 
                  ...config,
                  GroupBy: view.GroupBy, 
                  Sort: view.Sort 
                };
                return updatedView;
              }
              return view;
            });
           
            submitItem.ViewConfig = JSON.stringify({ Views: updatedViews });
          }
          submitItem.IDProject = this.id;
          console.log(JSON.parse(submitItem.ViewConfig));
          this.viewProvider
            .save(submitItem)
            .then((result: any) => {
              this.editView.Id = result.Id;
              this.env.showMessage('View saved', 'success');
              this.submitAttempt = false;
              this.loadedData();
            })
            .catch((err) => {
              this.env.showMessage('Cannot save, please try again', 'danger');
              this.submitAttempt = false;
          });
        }else {
          let submitItemSpace: any = {
            Id: this.space.Id,
          };
          
          let spaceValue = JSON.parse(this.space.activeSpace.ViewConfig);
       
          if (!submitItem.Id) {
            const existSpaces = spaceValue.Views || [];

            let newSortPosition = existSpaces.length > 0 ? Math.max(...existSpaces.map(view => view.Sort || 0)) + 1 : 1;
            config.Sort = [newSortPosition];
            submitItemSpace.ViewConfig = JSON.stringify({
              Views: [...spaceValue.Views, config]
            });
          } else {
            const existSpaces = spaceValue.Views || [];
            const updatedSpaces = existSpaces.map(space => {
              if (space.Layout.View.Type == config.Layout.View.Type && space.Sort[0] == config.Sort[0]) {
                return {
                  ...space,
                  ...config,
                  GroupBy: space.GroupBy,
                  Sort: space.Sort
                };
              }
              return space;
            });
          
            submitItemSpace.ViewConfig = JSON.stringify({ Views: updatedSpaces });
          }
          this.spaceProvider
            .save(submitItemSpace)
            .then((result: any) => {
              this.editView.Id = result.Id;
              
              if (!submitItem.Id) {
                this.space.activeSpace.ViewConfig = submitItemSpace.ViewConfig;
              }else {
                let configResult = JSON.parse(result.ViewConfig)
                spaceValue.Views = configResult.Views;
                this.space.activeSpace.ViewConfig = JSON.stringify(spaceValue);
              }
              
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
  }
}
