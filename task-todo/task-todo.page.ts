import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider, PM_TaskProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { ApiSetting } from 'src/app/services/static/api-setting';

import { ActivatedRoute } from '@angular/router';
import { FormArray, FormBuilder, FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'app-delivery-note',
  templateUrl: 'task-todo.page.html',
  styleUrls: ['task-todo.page.scss'],
})
export class TaskTodoPage extends PageBase {
  itemsState: any = [];
  itemsView = [];
  isAllRowOpened = false;
  typeList = [];

  list4Column: any = [];
  listPriorityHigh: any = [];
  listPriorityMedium: any = [];
  listPriorityLow: any = [];
  listPriorityNot: any = []; //null

  isCollapsed: boolean = false;
  isDisabled = true;

  constructor(
    public pageProvider: PM_TaskProvider,
    public branchProvider: BRA_BranchProvider,
    public modalController: ModalController,
    public popoverCtrl: PopoverController,
    public alertCtrl: AlertController,
    public formBuilder: FormBuilder,
    public loadingController: LoadingController,
    public env: EnvService,
    public navCtrl: NavController,
    public location: Location,
    public route: ActivatedRoute,
  ) {
    super();
    this.pageConfig.isShowFeature = true;
    this.pageConfig.isSubActive = false;

    this.query.Take = 5000;
    this.query.AllChildren = true;
    this.query.AllParent = true;
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
      ListPriorityHigh: this.formBuilder.array([]),
      ListPriorityMedium: this.formBuilder.array([]),
      ListPriorityLow: this.formBuilder.array([]),
      ListPriorityNot: this.formBuilder.array([]),
    });
  }

  priorityHigh: any;
  priorityMedium: any;
  priorityLow: any;
  priorityNot: any;
  preLoadData(event?: any): void {
    super.preLoadData(event);
    let taskPriority = this.env.getStatus('TaskPriority');
    Promise.all([taskPriority]).then((values: any) => {
      values[0].map((item) => {
        Promise.all([taskPriority]).then((values: any) => {
          values[0].forEach((item) => {
            switch (item.Code) {
              case 'HighPriorityUrgent':
                this.priorityHigh = item;
                break;
              case 'MediumPriorityNotUrgent':
                this.priorityMedium = item;
                break;
              case 'LowPriorityUrgent':
                this.priorityLow = item;
                break;
              case 'NotPriorityNotUrgent':
                this.priorityNot = item;
                break;
              default:
                break;
            }
          });
        });
      });
    });
  }
  loadedData(event) {
    this.buildFlatTree(this.items, this.itemsState, this.isAllRowOpened).then((resp: any) => {
      this.itemsState = resp;
      this.itemsView = this.itemsState.filter((d) => d.show);
    });
    this.items = this.items.filter((d) => d.Type === 'project');
    super.loadedData(event);
  }

  loadTaskTodo(i) {
    this.submitAttempt = true;
    let apiPath = {
      method: 'GET',
      url: function () {
        return ApiSetting.apiDomain('PM/Task/getAllTaskInProject/' + i.Id);
      },
    };

    this.loadingController
      .create({
        cssClass: 'my-custom-class',
        message: 'Đang tải dữ liệu...',
      })
      .then((loading) => {
        loading.present();

        this.pageProvider.commonService
          .connect(apiPath.method, apiPath.url(), null)
          .toPromise()
          .then((resp: any) => {
            this.clearFg();
            this.list4Column = resp;
            this.list4Column = this.list4Column?.sort((a, b) => a.Sort - b.Sort);
            this.listPriorityHigh = this.list4Column.filter((item) => item.Priority === 1);
            this.listPriorityMedium = this.list4Column.filter((item) => item.Priority === 2);
            this.listPriorityLow = this.list4Column.filter((item) => item.Priority === 3);
            this.listPriorityNot = this.list4Column.filter((item) => item.Priority === null);
            let groupsHigh = <FormArray>this.formGroup.controls.ListPriorityHigh;
            let groupsMedium = <FormArray>this.formGroup.controls.ListPriorityMedium;
            let groupsLow = <FormArray>this.formGroup.controls.ListPriorityLow;
            let groupsNot = <FormArray>this.formGroup.controls.ListPriorityNot;
            if (this.listPriorityHigh?.length) {
              this.listPriorityHigh.forEach((i) => this.addField(i, groupsHigh));
            }
            if (this.listPriorityMedium?.length) {
              this.listPriorityMedium.forEach((i) => this.addField(i, groupsMedium));
            }
            if (this.listPriorityLow?.length) {
              this.listPriorityLow.forEach((i) => this.addField(i, groupsLow));
            }
            if (this.listPriorityNot?.length) {
              this.listPriorityNot.forEach((i) => this.addField(i, groupsNot));
            }
            this.submitAttempt = false;
            if (loading) loading.dismiss();
            this.pageConfig.isSubActive = true;
          })
          .catch((err) => {
            if (err.message != null) {
              this.env.showTranslateMessage(err.message, 'danger');
            } else {
              this.env.showTranslateMessage('Cannot loading data', 'danger');
            }
            this.submitAttempt = false;
            if (loading) loading.dismiss();
            this.pageConfig.isSubActive = true;
          });
      });
  }

  toggleGroup4Column() {
    this.isCollapsed = !this.isCollapsed;
  }

  toggleReorder() {
    this.isDisabled = !this.isDisabled;
  }

  doReorder(ev, groups) {
    let obj = [];
    groups = ev.detail.complete(groups);
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      g.controls.Sort.setValue(i + 1);
      g.controls.Sort.markAsDirty();
      obj.push({
        Id: g.get('Id').value,
        Sort: g.get('Sort').value,
      });
    }
    if (obj.length > 0) {
      this.pageProvider.commonService
        .connect('PUT', 'PM/Task/putSort', obj)
        .toPromise()
        .then((rs) => {
          if (rs) {
            this.env.showTranslateMessage('Saving completed!', 'success');
          } else {
            this.env.showTranslateMessage('Cannot save, please try again', 'danger');
          }
        });
    }
  }

  clearFg() {
    let groupsHigh = <FormArray>this.formGroup.controls.ListPriorityHigh;
    let groupsMedium = <FormArray>this.formGroup.controls.ListPriorityMedium;
    let groupsLow = <FormArray>this.formGroup.controls.ListPriorityLow;
    let groupsNot = <FormArray>this.formGroup.controls.ListPriorityNot;
    groupsHigh.clear();
    groupsMedium.clear();
    groupsLow.clear();
    groupsNot.clear();
  }

  addField(field: any, groups: any) {
    let group = this.formBuilder.group({
      Id: new FormControl({ value: field.Id, disabled: false }),
      Name: new FormControl({ value: field.Name, disabled: false }),
      Remark: new FormControl({ value: field.Remark, disabled: false }),
      Sort: new FormControl({ value: field.Sort, disabled: false }),
    });
    groups.push(group);
  }

  toggleRow(ls, ite, toogle = false) {
    super.toggleRow(ls, ite, toogle);
    this.itemsView = this.itemsState.filter((d) => d.show);
  }
}
