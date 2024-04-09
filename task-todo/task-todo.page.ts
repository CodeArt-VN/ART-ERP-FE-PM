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
  branchList = [];

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
    this.id = this.route.snapshot.paramMap.get('id');
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
      ListPriority1: this.formBuilder.array([]),
      ListPriority2: this.formBuilder.array([]),
      ListPriority3: this.formBuilder.array([]),
      ListPriority4: this.formBuilder.array([]),
    });
  }

  loadedData(event) {
    this.items = this.items.filter((d) => d.Type === 'project');
    super.loadedData(event);
  }

  list4Column: any = [];
  listPriority1: any = [];
  listPriority2: any = [];
  listPriority3: any = [];
  listPriority4: any = []; //null
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
            this.listPriority1 = this.list4Column.filter((item) => item.Priority === 1);
            this.listPriority2 = this.list4Column.filter((item) => item.Priority === 2);
            this.listPriority3 = this.list4Column.filter((item) => item.Priority === 3);
            this.listPriority4 = this.list4Column.filter((item) => item.Priority === null);
            let groups1 = <FormArray>this.formGroup.controls.ListPriority1;
            let groups2 = <FormArray>this.formGroup.controls.ListPriority2;
            let groups3 = <FormArray>this.formGroup.controls.ListPriority3;
            let groups4 = <FormArray>this.formGroup.controls.ListPriority4;
            if (this.listPriority1?.length) {
              this.listPriority1.forEach((i) => this.addField(i, groups1));
            }
            if (this.listPriority2?.length) {
              this.listPriority2.forEach((i) => this.addField(i, groups2));
            }
            if (this.listPriority3?.length) {
              this.listPriority3.forEach((i) => this.addField(i, groups3));
            }
            if (this.listPriority4?.length) {
              this.listPriority4.forEach((i) => this.addField(i, groups4));
            }
            this.submitAttempt = false;
            if (loading) loading.dismiss();
          })
          .catch((err) => {
            if (err.message != null) {
              this.env.showMessage(err.message, 'danger');
            } else {
              this.env.showTranslateMessage('Cannot loading data', 'danger');
            }
            this.submitAttempt = false;
            if (loading) loading.dismiss();
          });
      });
  }

  isCollapsed: boolean = false;
  toggleGroup4Column() {
    this.isCollapsed = !this.isCollapsed;
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
    let groups1 = <FormArray>this.formGroup.controls.ListPriority1;
    let groups2 = <FormArray>this.formGroup.controls.ListPriority2;
    let groups3 = <FormArray>this.formGroup.controls.ListPriority3;
    let groups4 = <FormArray>this.formGroup.controls.ListPriority4;
    groups1.clear();
    groups2.clear();
    groups3.clear();
    groups4.clear();
  }

  // private patchFieldsValue() {
  //   this.pageConfig.showSpinner = true;
  //   this.formGroup.controls.TriggerActions = new FormArray([]);
  //   if (this.item.TriggerActions?.length) {
  //     this.item.TriggerActions.forEach((i) => this.addField(i, ));
  //   }
  //   this.pageConfig.showSpinner = false;
  // }

  addField(field: any, groups: any) {
    let group = this.formBuilder.group({
      Id: new FormControl({ value: field.Id, disabled: false }),
      Name: new FormControl({ value: field.Name, disabled: false }),
      Sort: new FormControl({ value: field.Sort, disabled: false }),
    });
    groups.push(group);
  }
}
