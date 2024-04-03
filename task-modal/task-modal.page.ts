import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController, ModalController, NavParams, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';

import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { PM_TaskLinkProvider, PM_TaskProvider } from 'src/app/services/static/services.service';

@Component({
  selector: 'app-task-modal',
  templateUrl: './task-modal.page.html',
  styleUrls: ['./task-modal.page.scss'],
})
export class TaskModalPage extends PageBase {
  task: any;
  constructor(
    public pageProvider: PM_TaskProvider,
    public taskLinkService: PM_TaskLinkProvider,
    public env: EnvService,
    public navCtrl: NavController,
    public route: ActivatedRoute,
    public modalController: ModalController,
    public alertCtrl: AlertController,
    public navParams: NavParams,
    public formBuilder: FormBuilder,
    public cdr: ChangeDetectorRef,
    public loadingController: LoadingController,
  ) {
    super();
    this.pageConfig.isDetailPage = true;
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
  typeDataSource = [
    {
      Code: 'task',
      Name: 'Task',
    },
    {
      Code: 'project',
      Name: 'Project',
    },
    {
      Code: 'milestone',
      Name: 'Milestone',
    },
  ];
  statusDataSource = [
    {
      Code: 'Processing',
      Name: 'Processing',
    },
    {
      Code: 'Done',
      Name: 'Done',
    },
  ];
  preLoadData(event) {
    this.item = this.task;
    super.preLoadData(event);
  }

  loadedData(event) {
    if (this.item?.Id) {
      this.addField(this.item);
    } else {
      this.addField(this.item, true);
    }
  }

  saveTask(update = false) {
    this.item = this.formGroup.value;
    this.saveChange2();
    return this.modalController.dismiss(this.item, update ? 'update' : 'create');
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
              controlName === 'StartDate' ||
              controlName === 'Name' ||
              controlName === 'Duration')
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
  async saveChange() {
    super.saveChange2();
  }
}
