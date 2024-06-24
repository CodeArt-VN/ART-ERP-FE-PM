import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController, ModalController, NavParams, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';

import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { HRM_StaffProvider, PM_TaskLinkProvider, PM_TaskProvider } from 'src/app/services/static/services.service';
import { Subject, concat, of, distinctUntilChanged, tap, switchMap, catchError, filter } from 'rxjs';
import { lib } from 'src/app/services/static/global-functions';

@Component({
  selector: 'app-task-modal',
  templateUrl: './task-modal.page.html',
  styleUrls: ['./task-modal.page.scss'],
})
export class TaskModalPage extends PageBase {
  task: any;
  listParent: any;
  parentDataSource: any[];
  constructor(
    public pageProvider: PM_TaskProvider,
    public taskLinkService: PM_TaskLinkProvider,
    public env: EnvService,
    public navCtrl: NavController,
    public route: ActivatedRoute,
    public modalController: ModalController,
    public staffProvider: HRM_StaffProvider,
    public alertCtrl: AlertController,
    public navParams: NavParams,
    public formBuilder: FormBuilder,
    public cdr: ChangeDetectorRef,
    public loadingController: LoadingController,
  ) {
    super();
    this.pageConfig.isDetailPage = false;
    this.formGroup = formBuilder.group({
      IDBranch: [this.env.selectedBranch],
      IDOpportunity: [''],
      IDLead: [''],
      IDProject: [''],
      IDOwner: [''],
      IDParent: [''],
      Id: new FormControl({ value: '', disabled: true }),
      Code: [''],
      Name: [''],
      Type: ['', Validators.required],
      Status: ['', Validators.required],
      Remark: [''],
      Sort: [''],
      StartDate: ['', Validators.required],
      EndDate: [''],
      PredictedClosingDate: [''],
      Duration: [''],
      ExpectedRevenue: [''],
      BudgetedCost: [''],
      ActualCost: [''],
      ActualRevenue: [''],
      StartDatePlan: ['', Validators.required],
      EndDatePlan: [''],
      DurationPlan: [''],
      Deadline: [''],
      Progress: [''],
      IsOpen: [''],
      Priority: [''],
      IsUnscheduled: [''],
      IsSplited: [''],
      IsDisabled: new FormControl({ value: '', disabled: true }),
      IsDeleted: new FormControl({ value: '', disabled: true }),
      CreatedBy: new FormControl({ value: '', disabled: true }),
      CreatedDate: new FormControl({ value: '', disabled: true }),
      ModifiedBy: new FormControl({ value: '', disabled: true }),
      ModifiedDate: new FormControl({ value: '', disabled: true }),
    });
  }

  priorityDataSource: any;
  typeDataSource: any;
  statusDataSource: any;
  storedType:any;
  storedParent: any;
  preLoadData(event) {
    this.item = this.task;
    let taskPriority = this.env.getType('TaskPriority');
    let taskType = this.env.getType('TaskType');
    let taskStatus = this.env.getStatus('TaskStatus');
    Promise.all([taskPriority, taskType, taskStatus]).then((values: any) => {
      let taskPriorityData = values[0];
      this.priorityDataSource = taskPriorityData.map((item) => {
        item.Code = parseInt(item.Code);
        return item;
      });
      this.storedType = [...values[1]];
      this.storedParent = [...this.listParent];
      this.checkParentAndType(this.item?.Type, values[1], this.listParent, this.item?.Id, false);

      //this.statusDataSource = values[2];
      this.statusDataSource = [
        {
          Code: 'InProgress',
          Name: 'InProgress',
        },
        {
          Code: 'Done',
          Name: 'Done',
        },
        {
          Code: 'Testing',
          Name: 'Testing',
        },
      ];
      super.preLoadData(event);
    });
  }
  _contactDataSource = {
    searchProvider: this.staffProvider,
    loading: false,
    input$: new Subject<string>(),
    selected: [],
    items$: null,
    id: this.id,
    initSearch() {
      this.loading = false;
      this.items$ = concat(
        of(this.selected),
        this.input$.pipe(
          distinctUntilChanged(),
          tap(() => (this.loading = true)),
          switchMap((term) =>
            this.searchProvider
              .search({
                SkipMCP: term ? false : true,
                SortBy: ['Id_desc'],
                Take: 20,
                Skip: 0,
                Term: term ? term : 'BP:' + this.item?.IDOwner,
              })
              .pipe(
                catchError(() => of([])), // empty list on error
                tap(() => (this.loading = false)),
              ),
          ),
        ),
      );
    },
  };
  async loadedData(event) {
    this.item.StartDatePlan = lib.dateFormat(this.item.StartDatePlan);
    this.item.Deadline = lib.dateFormat(this.item?.Deadline);

    this.item.StartDate = lib.dateFormat(this.item.StartDate);
    if (this.item?.EndDatePlan) {
      this.item.EndDatePlan = lib.dateFormat(this.item.EndDatePlan);
    }
    if (this.item?.EndDate) {
      this.item.EndDate = lib.dateFormat(this.item.EndDate);
    }
    if (this.item?.Id) {
      this.addField(this.item);
    } else {
      this.addField(this.item, true);
    }
    if (this.item?.IDOwner) {
      await this.staffProvider.getAnItem(this.item.IDOwner).then((data: any) => {
        if (data != null) {
          this._contactDataSource.selected.push(data);
        }
      });
    }
    this._contactDataSource.initSearch();
  }

  addField(field: any, markAsDirty = false) {
    if (markAsDirty) {
      for (const controlName in this.formGroup.controls) {
        if (field.hasOwnProperty(controlName)) {
          this.formGroup.get(controlName).setValue(field[controlName]);
          if (
            markAsDirty &&
            (controlName === 'IDBranch' ||
              controlName === 'IDParent' ||
              controlName === 'StartDatePlan' ||
              controlName === 'EndDatePlan' ||
              controlName === 'StartDate' ||
              controlName === 'EndDate' ||
              controlName === 'Name' ||
              controlName === 'Duration' ||
              controlName === 'DurationPlan')
          ) {
            this.formGroup.get(controlName).markAsDirty();
          }
        }
      }
    } else {
      for (const controlName in this.formGroup.controls) {
        if (field.hasOwnProperty(controlName)) {
          this.formGroup.get(controlName).setValue(field[controlName]);
        }
      }
    }
  }

  checkParentAndType(type, valuesType , listParent, id, filterType = false) {
    let typeArray = valuesType;
    let parentArray = listParent;
    switch (type) {
      case 'Folder':
        if (!id) {
          if (filterType) {
            parentArray = listParent.filter(d => d.Id != this.item.Id && d.Type == 'Folder');
          }
          break;
        } else {
          parentArray = listParent.filter(d => d.Id != this.item.Id && d.Type == 'Folder');
          let idParent = listParent.find(d => d.Id == id).IDParent;
          if(idParent) {
            let parentItem  = listParent.find(d => d.Id == idParent);
            switch (parentItem.Type) {
              case 'Folder':
                  typeArray = valuesType.filter(d => d.Code == 'Folder');
                  break;
            }
          }else {
            typeArray = valuesType;
          }
          break;
        }
      case 'List':
        if (!id) {
          if (filterType) {
            parentArray = listParent.filter(d => d.Type == 'List' || d.Type == 'Folder');
          } else {
            typeArray = valuesType.filter(d => d.Code != 'Folder');
          }
          break;
        } else {
          parentArray = listParent.filter(d => d.Id != this.item.Id && (d.Type == 'List' || d.Type == 'Folder'));
          let idParent = listParent.find(d => d.Id == id).IDParent;
          if(idParent) {
            let parentItem  = listParent.find(d => d.Id == idParent);
            switch (parentItem.Type) {
              case 'List':
                  typeArray = valuesType.filter(d => d.Code == 'List');
                  break;
              case 'Folder':
                  typeArray = valuesType.filter(d => d.Code == 'Folder' || d.Code == 'List');
                  break;
            }
          }else {
            typeArray = valuesType;
          }
          break;
        }

      case 'Backlog':
        if (!id) {
          if (filterType) {
            parentArray = listParent.filter(d => d.Type == 'Folder' || d.Type == 'List' || d.Type == 'Backlog');
          } else {
            typeArray = valuesType.filter(d => d.Code != 'Folder' && d.Code != 'List');
          }
          break;
        } else {
          parentArray = listParent.filter(d => d.Id != this.item.Id && (d.Type == 'Folder' || d.Type == 'List' || d.Type == 'Project'));
          let idParent = listParent.find(d => d.Id == id).IDParent;
          if(idParent) {
            let parentItem  = listParent.find(d => d.Id == idParent);
            switch (parentItem.Type) {
              case 'Backlog':
                  typeArray = valuesType.filter(d => d.Code == 'Backlog');
                  break;
              case 'List':
                  typeArray = valuesType.filter(d => d.Code == 'List' || d.Code == 'Backlog');
                  break;
              case 'Folder':
                  typeArray = valuesType.filter(d => d.Code == 'Folder' || d.Code == 'List' || d.Code == 'Backlog');
                  break;
            }
          }else {
            typeArray = valuesType;
          }
          break;
        }

      case 'Project':
        if (!id) {
          if (filterType) {
            parentArray = listParent.filter(d => d.Type == 'Folder' || d.Type == 'List' || d.Type == 'Project');
          } else {
            typeArray = valuesType.filter(d => d.Code != 'Folder' && d.Code != 'List');
          }
          break;
        } else {
          parentArray = listParent.filter(d => d.Id != this.item.Id && (d.Type == 'Folder' || d.Type == 'List' || d.Type == 'Backlog'));
          let idParent = listParent.find(d => d.Id == id).IDParent;
          if(idParent) {
            let parentItem  = listParent.find(d => d.Id == idParent);
            switch (parentItem.Type) {
              case 'Project':
                  typeArray = valuesType.filter(d => d.Code == 'Project');
                  break;
              case 'Backlog':
                  typeArray = valuesType.filter(d => d.Code == 'Backlog' || d.Code == 'Project');
                  break;
              case 'List':
                  typeArray = valuesType.filter(d => d.Code == 'List' || d.Code == 'Backlog' || d.Code == 'Project');
                  break;
              case 'Folder':
                  typeArray = valuesType.filter(d => d.Code == 'Folder' || d.Code == 'List' || d.Code == 'Backlog');
                  break;
            }
          }else {
            typeArray = valuesType;
          }
          break;
        }

      case 'Task':
        if (!id) {
          if (filterType) {
            parentArray = listParent.filter(d => d.Type != 'Milestone' || d.Type != 'Todo');
          } else {
            typeArray = valuesType.filter((d) => d.Code == 'Task' || d.Code == 'Todo' || d.Code == 'Milestone');
          }
          break;
        } else {
          parentArray = listParent.filter(d => d.Id != this.item.Id && (d.Type != 'Milestone' || d.Type != 'Todo'));
          let idParent = listParent.find(d => d.Id == id).IDParent;
          if(idParent) {
            let parentItem  = listParent.find(d => d.Id == idParent);
            switch (parentItem.Type) {
              case 'Task':
                  typeArray = valuesType.filter(d => d.Code == 'Task');
                  break;
              case 'Project':
                  typeArray = valuesType.filter(d => d.Code == 'Project' || d.Code == 'Task');
                  break;
              case 'Backlog':
                  typeArray = valuesType.filter(d => d.Code == 'Backlog' || d.Code == 'Project' || d.Code == 'Task');
                  break;
              case 'List':
                  typeArray = valuesType.filter(d => d.Code == 'List' || d.Code == 'Backlog' || d.Code == 'Project' || d.Code == 'Task');
                  break;
              case 'Folder':
                  typeArray = valuesType.filter(d => d.Code == 'Folder' || d.Code == 'List' || d.Code == 'Backlog' || d.Code == 'Task');
                  break;
            }
          }else {
            typeArray = valuesType;
          }
          break;
        }

      case 'Todo':
        if (!id) {
          if (filterType) {
            parentArray = listParent.filter(d => d.Type != 'Milestone');
          } else {
            typeArray = valuesType.filter(d => d.Code == 'Todo');
          }
          break;
        } else {
          parentArray = listParent.filter((d) => d.Id != this.item.Id && d.Type != 'Milestone');
          let idParent = listParent.find(d => d.Id == id).IDParent;
          if(idParent) {
            let parentItem  = listParent.find(d => d.Id == idParent);
            switch (parentItem.Type) {
              case 'Todo':
                  typeArray = valuesType.filter(d => d.Code == 'Todo');
                  break;
              case 'Project':
                  typeArray = valuesType.filter(d => d.Code == 'Project' || d.Code == 'Todo');
                  break;
              case 'Backlog':
                  typeArray = valuesType.filter(d => d.Code == 'Backlog' || d.Code == 'Project' || d.Code == 'Todo');
                  break;
              case 'List':
                  typeArray = valuesType.filter(d => d.Code == 'List' || d.Code == 'Backlog' || d.Code == 'Project' || d.Code == 'Todo');
                  break;
              case 'Folder':
                  typeArray = valuesType.filter(d => d.Code == 'Folder' || d.Code == 'List' || d.Code == 'Backlog' || d.Code == 'Todo');
                  break;
            }
          }else {
            typeArray = valuesType;
          }
          break;
        }

      case 'Milestone':
        if (!id) {
          if (filterType) {
            parentArray = listParent.filter(d => d.Type != 'Todo');
          } else {
            typeArray = valuesType.filter((d) => d.Code == 'Milestone');
          }
          break;
        } else {
          parentArray = listParent.filter((d) => d.Id != this.item.Id && d.Type != 'Todo');
          let idParent = listParent.find(d => d.Id == id).IDParent;
          if(idParent) {
            let parentItem  = listParent.find(d => d.Id == idParent);
            switch (parentItem.Type) {
              case 'Todo':
                  typeArray = valuesType.filter(d => d.Code == 'Milestone');
                  break;
              case 'Project':
                  typeArray = valuesType.filter(d => d.Code == 'Project' || d.Code == 'Milestone');
                  break;
              case 'Backlog':
                  typeArray = valuesType.filter(d => d.Code == 'Backlog' || d.Code == 'Project' || d.Code == 'Milestone');
                  break;
              case 'List':
                  typeArray = valuesType.filter(d => d.Code == 'List' || d.Code == 'Backlog' || d.Code == 'Project' || d.Code == 'Milestone');
                  break;
              case 'Folder':
                  typeArray = valuesType.filter(d => d.Code == 'Folder' || d.Code == 'List' || d.Code == 'Backlog' || d.Code == 'Milestone');
                  break;
            }
          }else {
            typeArray = valuesType;
          }
          break;
        }

      default:
        break;
    }

    this.typeDataSource = typeArray;
    this.parentDataSource = parentArray;
  }

  changeParent() {
    let parent = this.parentDataSource.find((d) => d.Id == this.formGroup.controls.IDParent.value);
    let type = parent?.Type;
    this.checkParentAndType(type, this.storedType, this.storedParent, this.formGroup.controls.Id.value, false);
    this.saveChange();
  }

  changeType() {
    this.checkParentAndType(this.formGroup.controls.Type.value, this.storedType, this.storedParent, this.formGroup.controls.Id.value, true);
    this.saveChange();
  }

  changeStartDate() {
    let startDate = new Date(this.formGroup.controls.StartDate.value);
    let endDate = new Date(this.formGroup.controls.EndDate.value);
    const duration = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    this.formGroup.controls.Duration.setValue(duration);
    this.formGroup.controls.Duration.markAsDirty();

    let endDateValue = new Date(startDate.getTime() + duration * 24 * 60 * 60 * 1000);
    this.formGroup.controls.EndDate.setValue(lib.dateFormat(endDateValue));
    this.formGroup.controls.EndDate.markAsDirty();
    this.saveChange();
  }

  changeEndDate() {
    const startDate = new Date(this.formGroup.controls.StartDate.value);
    let endDate = new Date(this.formGroup.controls.EndDate.value);
    if (endDate < startDate) {
      endDate = new Date(startDate);
      this.formGroup.controls.EndDate.setValue(lib.dateFormat(endDate));
    }

    const duration = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);

    this.formGroup.controls.Duration.setValue(duration);
    this.formGroup.controls.Duration.markAsDirty();
    this.saveChange();
  }

  changeDuration() {
    const startDate = new Date(this.formGroup.controls.StartDate.value);
    let duration = this.formGroup.controls.Duration.value;

    if (duration < 0) {
      duration = 0;
      this.formGroup.controls.Duration.setValue(0);
    }

    const endDateValue = new Date(startDate.getTime() + duration * 24 * 60 * 60 * 1000);
    this.formGroup.controls.EndDate.setValue(lib.dateFormat(endDateValue));
    this.formGroup.controls.EndDate.markAsDirty();
    this.saveChange();
  }

  changeStartDatePlan() {
    let startDatePlan = new Date(this.formGroup.controls.StartDatePlan.value);
    let endDatePlan = new Date(this.formGroup.controls.EndDatePlan.value);
    const durationPlan = (endDatePlan.getTime() - startDatePlan.getTime()) / (1000 * 60 * 60 * 24);
    this.formGroup.controls.DurationPlan.setValue(durationPlan);
    this.formGroup.controls.DurationPlan.markAsDirty();

    let endDateValuePlan = new Date(startDatePlan.getTime() + durationPlan * 24 * 60 * 60 * 1000);
    this.formGroup.controls.EndDatePlan.setValue(lib.dateFormat(endDateValuePlan));
    this.formGroup.controls.EndDatePlan.markAsDirty();
    this.saveChange();
  }

  changeEndDatePlan() {
    const startDatePlan = new Date(this.formGroup.controls.StartDatePlan.value);
    let endDatePlan = new Date(this.formGroup.controls.EndDatePlan.value);
    if (endDatePlan < startDatePlan) {
      endDatePlan = new Date(startDatePlan);
      this.formGroup.controls.EndDatePlan.setValue(lib.dateFormat(endDatePlan));
    }

    const durationPlan = (endDatePlan.getTime() - startDatePlan.getTime()) / (1000 * 60 * 60 * 24);

    this.formGroup.controls.DurationPlan.setValue(durationPlan);
    this.formGroup.controls.DurationPlan.markAsDirty();
    this.saveChange();
  }

  changeDurationPlan() {
    const startDatePlan = new Date(this.formGroup.controls.StartDatePlan.value);
    let durationPlan = this.formGroup.controls.DurationPlan.value;

    if (durationPlan < 0) {
      durationPlan = 0;
      this.formGroup.controls.DurationPlan.setValue(0);
    }

    const endDateValuePlan = new Date(startDatePlan.getTime() + durationPlan * 24 * 60 * 60 * 1000);
    this.formGroup.controls.EndDatePlan.setValue(lib.dateFormat(endDateValuePlan));
    this.formGroup.controls.EndDatePlan.markAsDirty();
    this.saveChange();
  }

  saveTask(update = false) {
    this.item = this.formGroup.value;
    this.saveChange2();
    return this.modalController.dismiss(this.item, update ? 'update' : 'create');
  }

  async saveChange() {
    this.saveChange2();
  }
}
