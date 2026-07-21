import { Component, ChangeDetectorRef, SecurityContext, Type } from '@angular/core';
import { NavController, ModalController, NavParams, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';

import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { HRM_StaffProvider, PM_TaskLinkProvider, PM_TaskProvider } from 'src/app/services/static/services.service';
import { Subject, concat, of, distinctUntilChanged, tap, switchMap, catchError, filter } from 'rxjs';
import { lib } from 'src/app/services/static/global-functions';
import { PM_Space, PM_Task } from 'src/app/models/model-list-interface';
import { DomSanitizer } from '@angular/platform-browser';

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
	isEditRemark = false;

	formDataSources: any = {
		Type: [],
		Status: [],
		IDParent: null,
		Priority: [],
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
		public loadingController: LoadingController,
		private sanitizer: DomSanitizer
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
				i.Code = parseInt(i.Code, 10);
			});
			this.getTypeDataSourceByParentTaskType();

			this.loadedData(event);
		});

		this.formDataSources.IDSpace = [this.space];

		this.formDataSources.IDOwner = this.buildSelectDataSource((term) => {
			return this.staffProvider.search({ Take: 20, Skip: 0, Keyword: term });
		});

		this.formDataSources.IDParent = this.buildSelectDataSource((term) => {
			return this.pageProvider.search({
				Take: 20,
				Skip: 0,
				Keyword: term,
				IDSpace: this.space?.Id,
				Type_in: JSON.stringify(this.getParentTaskTypeByTaskType(this.item?.Type)),
				Id_ne: this.formGroup.controls.Id.value,
				//NoNested: true,
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
		this.sanitizeRemarkControl(false);
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
			
			if (this.item.IDOwner || this.item._Staff) {
				this.formGroup.controls.IDOwner.setValue(this.item._Staff?.Id || this.item.IDOwner);
				this.formGroup.controls.IDOwner.markAsDirty();
			}
			if (this.item.Priority) this.formGroup.controls.Priority.markAsDirty();
		}
		this.normalizeDataSourceValues();
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

	private normalizeNumberControl(controlName: string) {
		const value = this.formGroup.controls[controlName].value;
		if (value === null || value === undefined || value === '') {
			return;
		}

		const numberValue = Number(value);
		if (!isNaN(numberValue) && numberValue !== value) {
			this.formGroup.controls[controlName].setValue(numberValue, { emitEvent: false });
		}
	}

	private normalizeDataSourceValues() {
		['IDSpace', 'IDParent', 'IDOwner', 'Priority'].forEach((controlName) => this.normalizeNumberControl(controlName));
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

	private getDateValue(controlName: string): Date | null {
		const value = this.formGroup.controls[controlName].value;
		if (!value) return null;

		const date = new Date(value);
		return isNaN(date.getTime()) ? null : date;
	}

	private getDurationValue(controlName: string): number | null {
		const value = this.formGroup.controls[controlName].value;
		if (value === null || value === undefined || value === '') return null;

		const duration = Number(value);
		return isNaN(duration) ? null : Math.max(duration, 0);
	}

	private formatDateTimeLocal(date: Date): string {
		return date.toLocaleString('sv-SE', { hour12: false }).replace(' ', 'T').slice(0, 16);
	}

	private addDays(date: Date, duration: number): Date {
		const endDate = new Date(date);
		const wholeDays = Math.floor(duration);
		const fractionalDay = duration - wholeDays;
		endDate.setDate(endDate.getDate() + wholeDays);
		endDate.setHours(endDate.getHours() + fractionalDay * 24);
		return endDate;
	}

	private calculateDuration(startDate: Date, endDate: Date): number {
		const duration = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
		return Number(Math.max(duration, 0).toFixed(4));
	}

	private setDateControl(controlName: string, date: Date) {
		this.formGroup.controls[controlName].setValue(this.formatDateTimeLocal(date));
		this.formGroup.controls[controlName].markAsDirty();
	}

	private setDurationControl(controlName: string, duration: number) {
		this.formGroup.controls[controlName].setValue(duration);
		this.formGroup.controls[controlName].markAsDirty();
	}

	private changeStartDateByDuration(startControl: string, endControl: string, durationControl: string) {
		const startDate = this.getDateValue(startControl);
		if (!startDate) {
			this.saveChange();
			return;
		}

		const duration = this.getDurationValue(durationControl);
		const endDate = this.getDateValue(endControl);

		if (duration !== null) {
			this.setDateControl(endControl, this.addDays(startDate, duration));
		} else if (endDate) {
			if (endDate < startDate) {
				this.setDateControl(endControl, startDate);
				this.setDurationControl(durationControl, 0);
			} else {
				this.setDurationControl(durationControl, this.calculateDuration(startDate, endDate));
			}
		}

		this.saveChange();
	}

	private changeEndDateByStartDate(startControl: string, endControl: string, durationControl: string) {
		const startDate = this.getDateValue(startControl);
		let endDate = this.getDateValue(endControl);

		if (!startDate || !endDate) {
			this.saveChange();
			return;
		}

		if (endDate < startDate) {
			endDate = new Date(startDate);
			this.setDateControl(endControl, endDate);
		}

		this.setDurationControl(durationControl, this.calculateDuration(startDate, endDate));
		this.saveChange();
	}

	private changeDurationByStartDate(startControl: string, endControl: string, durationControl: string) {
		const startDate = this.getDateValue(startControl);
		let duration = this.getDurationValue(durationControl);

		if (duration === null) duration = 0;
		this.setDurationControl(durationControl, duration);

		if (startDate) {
			this.setDateControl(endControl, this.addDays(startDate, duration));
		}

		this.saveChange();
	}

	changeStartDate() {
		this.changeStartDateByDuration('StartDate', 'EndDate', 'Duration');
	}

	changeEndDate() {
		this.changeEndDateByStartDate('StartDate', 'EndDate', 'Duration');
	}

	changeDuration() {
		this.changeDurationByStartDate('StartDate', 'EndDate', 'Duration');
	}

	changeStartDatePlan() {
		this.changeStartDateByDuration('StartDatePlan', 'EndDatePlan', 'DurationPlan');
	}

	changeEndDatePlan() {
		this.changeEndDateByStartDate('StartDatePlan', 'EndDatePlan', 'DurationPlan');
	}

	changeDurationPlan() {
		this.changeDurationByStartDate('StartDatePlan', 'EndDatePlan', 'DurationPlan');
	}

	saveTask(update = false) {
		this.item = this.formGroup.value;
		this.saveChange2();
		return this.modalController.dismiss(this.item, update ? 'update' : 'create');
	}

	async saveChange() {
		this.sanitizeRemarkControl();
		this.saveChange2();
	}

	editRemark() {
		this.sanitizeRemarkControl(false);
		this.isEditRemark = true;
	}

	previewRemark() {
		this.sanitizeRemarkControl(false);
		this.isEditRemark = false;
	}

	get sanitizedRemark() {
		return this.sanitizeRemarkHtml(this.formGroup.controls.Remark.value);
	}

	private sanitizeRemarkControl(markAsDirty = true) {
		const control = this.formGroup.controls.Remark;
		const value = control.value;
		if (value === null || value === undefined || value === '') {
			return;
		}
		const sanitizedValue = this.sanitizeRemarkHtml(value);
		if (value !== sanitizedValue) {
			control.setValue(sanitizedValue, { emitEvent: false });
			if (markAsDirty) {
				control.markAsDirty();
			}
		}
	}

	private sanitizeRemarkHtml(value: any) {
		if (!value) {
			return '';
		}
		return this.sanitizer.sanitize(SecurityContext.HTML, String(value)) || '';
	}

	//TODO: Remove empty functions
	bindLabel = 'Name';
}
