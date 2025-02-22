import { Component, ChangeDetectorRef, Type } from '@angular/core';
import { NavController, ModalController, NavParams, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';

import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { HRM_StaffProvider, PM_TaskLinkProvider, PM_TaskProvider } from 'src/app/services/static/services.service';
import { Subject, concat, of, distinctUntilChanged, tap, switchMap, catchError, filter } from 'rxjs';
import { lib } from 'src/app/services/static/global-functions';
import { PM_Space, PM_Task } from 'src/app/models/model-list-interface';

@Component({
	selector: 'app-task-modal',
	templateUrl: './task-modal.page.html',
	styleUrls: ['./task-modal.page.scss'],
	standalone: false,
})
export class TaskModalPage extends PageBase {
	parentTask = null;
	space = null;
	typeList = [];

	formDataSources: any = {
		Type: null,
		Status: null,
		IDParent: null,
		Priority: null,
		IDSpace: null,
	};

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
		public loadingController: LoadingController
	) {
		super();
		this.pageConfig.isDetailPage = true;
		this.formGroup = formBuilder.group({
			IDBranch: [this.env.selectedBranch],
			IDOpportunity: [''],
			IDLead: [''],
			IDProject: [''],
			IDSpace: [''],
			IDOwner: [null],
			IDParent: [''],
			Id: new FormControl({ value: '', disabled: true }),
			Code: [''],
			Name: ['', Validators.required],
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
			StartDatePlan: [''],
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

	preLoadData(event) {
		Promise.all([this.env.getType('TaskPriority'), this.env.getType('TaskType')]).then((values: any) => {
			this.formDataSources.Priority = values[0];
			this.typeList = values[1];
			this.formDataSources.Status = this.space.statusList;

			this.formDataSources.Priority.forEach((i) => {
				i.Code = parseInt(i.Code);
			});
			this.getTypeDataSourceByParentTaskType();

			this.loadedData(event);
		});

		this.formDataSources.IDSpace = [this.space];

		this.formDataSources.IDOwner = this.buildSelectDataSource((term) => {
			return this.staffProvider.search({ Take: 20, Skip: 0, Term: term });
		});

		this.formDataSources.IDParent = this.buildSelectDataSource((term) => {
			return this.pageProvider.search({
				Take: 20,
				Skip: 0,
				Keyword: term,
				IDSpace: this.space?.Id,
				Type_in: JSON.stringify(this.getParentTaskTypeByTaskType(this.item?.Type)),
				Id_ne: this.formGroup.controls.Id.value,
				NoNested: true,
				AllParent: true,
			});
		}, true);

		this.formDataSources.IDOwner.initSearch();
		this.formDataSources.IDParent.initSearch();

		if (this.parentTask) this.formDataSources.IDParent.selected.push(this.parentTask);
		if (this.item._Staff) this.formDataSources.IDOwner.selected.push(this.item._Staff);
	}

	loadedData(event) {
		super.loadedData(event);
		if (!this.item.Id) {
			this.formGroup.controls.IDBranch.markAsDirty();

			if (this.item.Type) this.formGroup.controls.Type.setValue(this.item.Type);
			else this.formGroup.controls.Type.setValue(this.formDataSources.Type[1].Code);
			this.formGroup.controls.Type.markAsDirty();

			if (this.item.StartDate) this.formGroup.controls.StartDate.setValue(this.item.StartDate);
			else this.formGroup.controls.StartDate.setValue(lib.dateFormat(new Date(), 'yyyy-mm-ddThh:MM:ss').slice(0, 19).slice(0, 13) + ':00:00');
			this.formGroup.controls.StartDate.markAsDirty();

			if (this.parentTask) {
				this.formGroup.controls.IDParent.setValue(this.parentTask.Id);
				this.formGroup.controls.IDParent.markAsDirty();
			}
			if (this.item.StartDatePlan) this.formGroup.controls.StartDatePlan.setValue(this.item.StartDatePlan);
			else this.formGroup.controls.StartDatePlan.setValue(lib.dateFormat(new Date(), 'yyyy-mm-ddThh:MM:ss').slice(0, 19).slice(0, 13) + ':00:00');
			this.formGroup.controls.StartDatePlan.markAsDirty();

			this.formGroup.controls.IDSpace.setValue(this.space.Id);
			this.formGroup.controls.IDSpace.markAsDirty();

			if (this.item.Status) this.formGroup.controls.Status.markAsDirty();
			if (this.item.EndDate) this.formGroup.controls.EndDate.markAsDirty();
			if (this.item.EndDatePlan) this.formGroup.controls.EndDatePlan.markAsDirty();
			if (this.item.Duration) this.formGroup.controls.Duration.markAsDirty();
			if (this.item.DurationPlan) this.formGroup.controls.DurationPlan.markAsDirty();
			if (this.item.Deadline) this.formGroup.controls.Deadline.markAsDirty();
			if (this.item.IDOwner) this.formGroup.controls.IDOwner.markAsDirty();
			if (this.item.Priority) this.formGroup.controls.Priority.markAsDirty();
		}
		let listType = [...new Set(this.formDataSources.Status.map((o) => o.Type))].map((o) => {
			return {
				Id: lib.generateUID(),
				Code: o,
				Name: o,
			};
		});
		listType.forEach((x) => {
			this.formDataSources.Status.map((o) => {
				if (o.Type == x.Code) o.IDParent = x.Id;
			});
		});
		this.formDataSources.Status = [...this.formDataSources.Status, ...listType];

		lib.buildFlatTree(this.formDataSources.Status, []).then((resp: any) => {
			this.formDataSources.Status = [...resp];
			this.formDataSources.Status.filter((o) => !o.IDParent).forEach((x) => (x.disabled = true));
		});
	}

	getTypeDataSourceByParentTaskType() {
		let parentType = this.parentTask?.Type;
		let notAllowTypes = [];

		//Set not allow types for 'Project', 'Folder', 'List', 'Backlog', 'Task', 'Todo', 'Milestone' parent types
		switch (parentType) {
			case 'List':
				notAllowTypes = ['Folder'];
				break;
			case 'Backlog':
				notAllowTypes = ['Folder', 'List'];
				break;
			case 'Task':
				notAllowTypes = ['Folder', 'List', 'Backlog', 'Project'];
				break;
			case 'Todo':
				notAllowTypes = ['Folder', 'List', 'Backlog', 'Project', 'Task', 'Todo', 'Milestone'];
				break;
			case 'Milestone':
				notAllowTypes = ['Folder', 'List', 'Backlog', 'Project', 'Task', 'Todo', 'Milestone'];
				break;
		}

		this.formDataSources.Type = this.typeList.filter((d) => !notAllowTypes.includes(d.Code));
	}

	getParentTaskTypeByTaskType(Type) {
		let parentTypes = ['Folder', 'Project', 'List', 'Backlog', 'Task'];

		switch (Type) {
			case 'Project':
				parentTypes = ['Folder', 'Project'];
				break;
			case 'Folder':
				parentTypes = ['Folder', 'Project'];
				break;
			case 'List':
				parentTypes = ['Folder', 'Project'];
				break;
			case 'Backlog':
				parentTypes = ['Folder', 'Project', 'List'];
				break;
			case 'Task':
				parentTypes = ['Folder', 'Project', 'List', 'Backlog'];
				break;
			case 'Todo':
				parentTypes = ['Folder', 'Project', 'List', 'Backlog', 'Task'];
				break;
			case 'Milestone':
				parentTypes = ['Folder', 'Project', 'List', 'Backlog', 'Task'];
				break;
		}
		return parentTypes;
	}

	changeParent() {
		//Check valid parent task type
		this.saveChange();
	}

	changeType() {
		//Check valid task type
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
