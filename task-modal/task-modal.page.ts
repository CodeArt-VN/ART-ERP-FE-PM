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
  parentType: string;
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

  preLoadData(event) {
    this.item = this.task;
    this.items = this.listParent;
    let taskPriority = this.env.getType('TaskPriority');
    let taskType = this.env.getType('TaskType');
    let taskStatus = this.env.getStatus('TaskStatus');
    Promise.all([taskPriority, taskType, taskStatus]).then((values: any) => {
      let taskPriorityData = values[0];
      this.priorityDataSource = taskPriorityData.map((item) => {
        item.Code = parseInt(item.Code);
        return item;
      });
      this.getTypeByParentTaskType(this.item?.Type, values[1], this.items, this.item?.Id, false);

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
      this.loadedData(event);
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
  loadedData(event) {
    if (this.item?.Id) {
      this.addField(this.item);
    } else {
      this.addField(this.item, true);
    }
    if (this.item?.IDOwner) {
      this.staffProvider.getAnItem(this.item.IDOwner).then((data: any) => {
        if (data != null) {
          this._contactDataSource.selected.push(data);
        }
      });
    }
    this._contactDataSource.initSearch();
  }

  addField(item: any, markAsDirty = false) {
    this.formGroup?.patchValue(item);
    if (markAsDirty) {
      this.formGroup.controls.IDBranch.markAsDirty();
      this.formGroup.controls.IDParent.markAsDirty();
      this.formGroup.controls.Type.markAsDirty();
      this.formGroup.controls.StartDatePlan.markAsDirty();
      this.formGroup.controls.EndDatePlan.markAsDirty();
      this.formGroup.controls.StartDate.markAsDirty();
      this.formGroup.controls.EndDate.markAsDirty();
      this.formGroup.controls.Name.markAsDirty();
      this.formGroup.controls.Duration.markAsDirty();
      this.formGroup.controls.DurationPlan.markAsDirty();
    }
  }

  getTypeByParentTaskType(type, valuesType, listParent, id, filterType = false) {
    let queryParentArray = [];
    let queryNotInTypeArray = [];
    let queryTypeArray = [];
    if (type) queryParentArray = [type];

    let typeArray = valuesType;
    let parentArray = listParent;

    let idParent = listParent.find((d) => d.Id == id)?.IDParent;
    let parentType = listParent.find((d) => d.Id == idParent)?.Type;
    if (parentType) {
      queryTypeArray = [parentType, type];
    } else {
      typeArray = valuesType;
    }
    switch (type) {
      case 'List':
        queryParentArray.push('Folder');
        queryNotInTypeArray.push('Folder');
        break;

      case 'Backlog':
        queryParentArray.push('Folder', 'List');
        queryNotInTypeArray.push('Folder', 'List');
        if (parentType == 'Folder') {
          queryTypeArray.push('List');
        }
        break;

      case 'Project':
        queryParentArray.push('Folder', 'List', 'Backlog');
        queryNotInTypeArray.push('Folder', 'List', 'Backlog');
        switch (parentType) {
          case 'List':
            queryTypeArray.push('Backlog');
            break;
          case 'Folder':
            queryTypeArray.push('List', 'Backlog');
            break;
        }

      case 'Task':
        queryParentArray.push('Folder', 'List', 'Backlog', 'Project');
        queryNotInTypeArray.push('Folder', 'List', 'Backlog', 'Project');
        switch (parentType) {
          case 'Backlog':
            queryTypeArray.push('Project');
            break;
          case 'List':
            queryTypeArray.push('Backlog', 'Project');
            break;
          case 'Folder':
            queryTypeArray.push('List', 'Backlog', 'Project');
            break;
        }
        break;

      case 'Todo':
        queryParentArray.push('Folder', 'List', 'Backlog', 'Project', 'Task');
        queryNotInTypeArray.push('Folder', 'List', 'Backlog', 'Project', 'Task', 'Milestone');
        switch (parentType) {
          case 'Project':
            queryTypeArray.push('Task');
            break;
          case 'Backlog':
            queryTypeArray.push('Project', 'Task');
            break;
          case 'List':
            queryTypeArray.push('Backlog', 'Project', 'Task');
            break;
          case 'Folder':
            queryTypeArray.push('List', 'Backlog', 'Project', 'Task');
            break;
        }
        break;

      case 'Milestone':
        queryParentArray.push('Folder', 'List', 'Backlog', 'Project', 'Task');
        queryNotInTypeArray.push('Folder', 'List', 'Backlog', 'Project', 'Task', 'Todo');
        switch (parentType) {
          case 'Project':
            queryTypeArray.push('Task');
            break;
          case 'Backlog':
            queryTypeArray.push('Project', 'Task');
            break;
          case 'List':
            queryTypeArray.push('Backlog', 'Project', 'Task');
            break;
          case 'Folder':
            queryTypeArray.push('List', 'Backlog', 'Project', 'Task');
            break;
        }
        break;
      default:
        break;
    }
    if (!id) {
      if (filterType) {
        parentArray = listParent.filter((d) => queryParentArray.includes(d.Type));
      } else {
        typeArray = valuesType.filter((d) => !queryNotInTypeArray.includes(d.Code));
      }
    } else {
      parentArray = listParent.filter((d) => d.Id != this.item.Id && queryParentArray.includes(d.Type));
      typeArray = valuesType.filter((d) => !queryNotInTypeArray.includes(d.Code));
      //if(parentType) typeArray = valuesType.filter((d) => queryTypeArray.includes(d.Code));
    }
    this.typeDataSource = typeArray;
    this.parentDataSource = parentArray;
  }

  changeParent() {
    let parent = this.parentDataSource.find((d) => d.Id == this.formGroup.controls.IDParent.value);
    let type = parent?.Type;
    //this.getTypeByParentTaskType(type, this.storedType, this.items, this.formGroup.controls.Id.value, false);
    this.saveChange();
  }

  changeType() {
    // this.getTypeByParentTaskType(
    //   this.formGroup.controls.Type.value,
    //   this.storedType,
    //   this.items,
    //   this.formGroup.controls.Id.value,
    //   true,
    // );
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
