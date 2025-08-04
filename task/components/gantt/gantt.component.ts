import { Location } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild, ViewEncapsulation } from '@angular/core';
import { AlertController, LoadingController, ModalController, NavController, PopoverController } from '@ionic/angular';

import { EnvService } from 'src/app/services/core/env.service';
import { BRA_BranchProvider, PM_TaskLinkProvider, PM_TaskProvider } from 'src/app/services/static/services.service';
import { Link, Task } from '../../../_models/task';
import { DynamicScriptLoaderService } from 'src/app/services/custom.service';
import { thirdPartyLibs } from 'src/app/services/static/thirdPartyLibs';

declare var gantt: any;

@Component({
	encapsulation: ViewEncapsulation.None,
	selector: 'app-gantt',
	templateUrl: 'gantt.component.html',
	styleUrls: ['gantt.component.scss'],
	standalone: false,
})
export class GanttComponent implements OnInit {
	@ViewChild('gantt_here', { static: true }) ganttContainer!: ElementRef;
	ganttEvents = [];

	isGanttLoaded = false; // gantt loaded
	isDataReady = false; // input data

	@Input() items: any;
	@Input() linksData: Link[] = [];
	@Input() listParent: any[] = [];
	submitAttempt = false;

	constructor(
		public pageProvider: PM_TaskProvider,
		public taskLinkService: PM_TaskLinkProvider,
		public branchProvider: BRA_BranchProvider,
		public modalController: ModalController,
		public popoverCtrl: PopoverController,
		public alertCtrl: AlertController,
		public loadingController: LoadingController,
		public env: EnvService,
		public navCtrl: NavController,
		public location: Location,
		public dynamicScriptLoaderService: DynamicScriptLoaderService
	) {
		this.env.getEvents().subscribe((data) => {
			if (data.Code == 'app:autoCalculateLink') {
				this.autoCalculateLink();
			}
		});
	}
	@Output() loadDataGantt = new EventEmitter();

	ngOnInit(): void {}

	ngOnDestroy() {
		this.clearGanttEvents();
	}

	ngAfterViewInit() {
		this.loadGanttLibrary();
	}

	ngOnChanges() {
		this.isDataReady = this.items.length > 0;
		if (this.isGanttLoaded && this.isDataReady) {
			this.loadGantt();
		}
	}

	ionViewDidEnter() {
		//Resize grid when parent dom resize
		var gantt_here = document.getElementById('gantt_here');
		new ResizeObserver(() => gantt.setSizes()).observe(gantt_here);
	}

	todayMarker = null;

	loadGanttLibrary() {
		if (typeof gantt !== 'undefined') this.initGantt();
		else
			this.dynamicScriptLoaderService
				.loadResources(thirdPartyLibs.gantt.source)
				.then(() => this.initGantt())
				.catch((error) => console.error('Error loading gantt script', error));
	}

	initGantt() {
		var zoomConfig = {
			levels: [
				{
					name: 'hour',
					scale_height: 50,
					min_column_width: 25,
					scales: [
						{ unit: 'day', format: '%d' },
						{ unit: 'hour', format: '%H' },
					],
				},
				{
					name: 'day',
					scale_height: 27,
					min_column_width: 25,
					scales: [{ unit: 'day', step: 1, format: '%d %M' }],
				},
				{
					name: 'week',
					scale_height: 50,
					min_column_width: 50,
					scales: [
						{
							unit: 'week',
							step: 1,
							format: function (date) {
								var dateToStr = gantt.date.date_to_str('%d %M');
								var endDate = gantt.date.add(date, -6, 'day');
								var weekNum = gantt.date.date_to_str('%W')(date);
								return '#' + weekNum + ', ' + dateToStr(date) + ' - ' + dateToStr(endDate);
							},
						},
						{ unit: 'day', step: 1, format: '%j %D' },
					],
				},
				{
					name: 'month',
					scale_height: 50,
					min_column_width: 120,
					scales: [
						{ unit: 'month', format: '%F, %Y' },
						{ unit: 'week', format: 'Week #%W' },
					],
				},
				{
					name: 'quarter',
					height: 50,
					min_column_width: 90,
					scales: [
						{
							unit: 'quarter',
							step: 1,
							format: function (date) {
								var dateToStr = gantt.date.date_to_str('%M');
								var endDate = gantt.date.add(gantt.date.add(date, 3, 'month'), -1, 'day');
								return dateToStr(date) + ' - ' + dateToStr(endDate);
							},
						},
						{ unit: 'month', step: 1, format: '%M' },
					],
				},
				{
					name: 'year',
					scale_height: 27,
					min_column_width: 30,
					scales: [{ unit: 'year', step: 1, format: '%Y' }],
				},
			],
			useKey: 'ctrlKey',
			trigger: 'wheel',
			element: function () {
				return gantt.$root.querySelector('.gantt_task');
			},
		};

		gantt.ext.zoom.init(zoomConfig);
		gantt.ext.zoom.setLevel('week');

		gantt.plugins({
			marker: true,
			drag_timeline: true,
			auto_scheduling: true,
			grouping: true,
		});

		let gridConfig = {
			columns: [
				{ name: 'text', label: 'Name', tree: true, width: '*', resize: true },

				{
					name: 'buttons',
					align: 'center',
					label: '<div class="gantt_grid_head_cell gantt_grid_head_add" onclick="gantt.createTask()"></div>',
					width: 40,
					template: (task) => {
						let projectTypes = ['Project', 'Folder', 'List', 'Backlog'];
						if (projectTypes.includes(task._task?.Type)) return '<div role="button" aria-label="New task" class="gantt_add"></div>';
						return `<ion-icon class="clickable" name="play-circle-outline" onclick="gantt.callEvent('onTaskDblClick', [${task.id},0])"></ion-icon>`;
					},
				},

				// { name: 'start_date', label: 'Start Time', align: 'center', resize: true },
				// { name: 'duration', label: 'Duration', align: 'center', width: 70, resize: true },
			],
		};

		let secondGridColumns = {
			columns: [
				{
					label: 'Members',
					width: 120,
					resize: true,
					template: (task) => {
						let avatars = '';
						for (let i = 0; i < task._task._members?.length; i++) {
							const member = task._task._members[i];
							avatars += `<div class="avatar ${task._task._members?.length > 1 && member._mainOwner ? 'main' : ''}"><img src="${member._avatar}" onError="this.src='../../assets/avartar-empty.jpg'" title="${member.FullName}"></div>`;
						}
						let avatarHtml = `<div class="avatar-container">${avatars}</div>`;
						return avatars ? avatarHtml : '';
					},
				},
			],
		};

		gantt.config.layout = {
			css: 'gantt_container',
			rows: [
				{
					cols: [
						{ view: 'grid', id: 'grid', scrollX: 'scrollHor', scrollY: 'scrollVer', config: gridConfig },
						{ resizer: true, width: 1 },
						{ view: 'timeline', id: 'timeline', scrollX: 'scrollHor', scrollY: 'scrollVer' },
						{ resizer: true, width: 1 },
						{ view: 'grid', width: 120, bind: 'task', scrollY: 'scrollVer', config: secondGridColumns },
						{ view: 'scrollbar', scroll: 'y', id: 'scrollVer' },
					],
				},
				{ view: 'scrollbar', scroll: 'x', id: 'scrollHor', height: 20 },
			],
		};
		gantt.config.date_format = '%Y-%m-%d %H:%i';
		gantt.config.work_time = true;
		gantt.config.auto_scheduling = true;
		gantt.config.auto_scheduling_use_progress = true; //When the config is enabled, completed tasks will be excluded from the critical path and auto scheduling

		gantt.config.drag_timeline = {
			ignore: '.gantt_task_line, .gantt_task_link',
			useKey: false,
		};

		gantt.templates.timeline_cell_class = function (task, date) {
			if (!gantt.isWorkTime(date)) return 'week_end';
			return '';
		};
		gantt.templates.grid_row_class = function (start, end, task) {
			if (task.$level > 1) {
				return 'lll';
			}
			return '';
		};
		gantt.templates.task_class = function (start, end, task) {
			return task._task?.Type + ' ' + (end < new Date() ? 'overdue' : '');
		};

		gantt.templates.grid_file = gantt.templates.grid_folder = function (item) {
			//let openClass = item.$open ? 'gantt_line_open' : 'gantt_line_closed';
			let color = item._task._Type?.Color || 'dark';
			let icon = item._task._Type?.Icon || 'sub';
			return `<div class="gantt_tree_icon flex-center"><ion-icon class="min-btn" color="${color}" name="${icon}"></ion-icon></div>`;
		};

		gantt.templates.task_text = (start: Date, end: Date, task: any): string => {
			let projectTypes = ['Project', 'Folder', 'List', 'Backlog'];
			if (projectTypes.includes(task._task?.Type)) return '';

			let avatars = '';
			for (let i = 0; i < task._task._members?.length; i++) {
				const member = task._task._members[i];
				avatars += `<div class="avatar ${task._task._members?.length > 1 && member._mainOwner ? 'main' : ''}"><img src="${member._avatar}" onError="this.src='../../assets/avartar-empty.jpg'" title="${member.FullName}${member._mainOwner ? ' - main owner' : ''}"></div>`;
			}
			let avatarHtml = `<div class="avatar-container">${avatars} </div>`;
			const textHtml = `<div class="text">${task.text}</div>`;
			return (avatars ? avatarHtml : '') + textHtml;
		};

		gantt.templates.rightside_text = function (start, end, task) {
			if (task.type == gantt.config.types.milestone) return task.text;
			return '';
		};

		gantt.init(this.ganttContainer.nativeElement);

		//Gantt events
		this.clearGanttEvents();
		const dp = gantt.createDataProcessor({
			task: {
				update: (data: Task) => this.updateTask(data),
			},
			link: {
				update: (data: Link) => this.updateLink(data),
				create: (data: Link) => this.createLink(data),
				delete: (id: any) => this.deleteLink(id),
			},
		});

		//create task
		this.ganttEvents.push(
			gantt.attachEvent('onTaskCreated', (e: any) => {
				this.onOpenTask({ Id: 0, IDParent: parseInt(e?.parent) });
			})
		);

		//update task
		this.ganttEvents.push(
			gantt.attachEvent('onTaskDblClick', (id, e) => {
				let task = this.items.find((d) => d.Id == id);
				this.onOpenTask({ Id: task.Id, IDParent: task.IDParent });
			})
		);
		this.ganttEvents.push(
			gantt.attachEvent('onTaskDblClick1', (id, e) => {
				let task = this.items.find((d) => d.Id == id);
				this.onOpenTask({ Id: task.Id, IDParent: task.IDParent });
			})
		);

		//delete link
		this.ganttEvents.push(
			gantt.attachEvent('onLinkDblClick', (id, e) => {
				const link = gantt.getLink(id);
				const src = gantt.getTask(link.source);
				const trg = gantt.getTask(link.target);
				if (this.submitAttempt == false) {
					this.submitAttempt = true;
					this.env
						.showPrompt({ code: 'Bạn có chắc muốn xóa liên kết <b> {{value}} - {{value1}} </b> không?', value: { value: src.text, value1: trg.text } }, null, '')
						.then((_) => {
							this.submitAttempt = false;
							const deleteLink = dp._router.link.delete;
							deleteLink.call(dp._router.link, Number(id));
						})
						.catch((er) => {
							this.submitAttempt = false;
						});
				}
			})
		);

		this.isGanttLoaded = true;
		// Thêm dòng này để cập nhật lại layout và scrollbar

		if (this.isDataReady) {
			this.loadGantt();
		}
	}

	clearGanttEvents() {
		while (this.ganttEvents.length) gantt.detachEvent(this.ganttEvents.pop());
	}

	showGroups(listname) {
		//view-source:https://docs.dhtmlx.com/gantt/samples/02_extensions/08_tasks_grouping.html
		if (listname) {
			gantt.groupBy({
				groups: gantt.serverList(listname),
				relation_property: listname,
				group_id: 'key',
				group_text: 'label',
			});
			gantt.sort('start_date');
		} else {
			gantt.groupBy(false);
		}
	}

	loadGantt() {
		let data: Task[] = this.items.map((task: any) => {
			let start = task.StartDate != null ? task.StartDate.split('T')[0] + ' ' + task.StartDate.split('T')[1].substring(0, 5) : null;
			let end = task.EndDate != null ? task.EndDate.split('T')[0] + ' ' + task.EndDate.split('T')[1].substring(0, 5) : null;
			return {
				id: task.Id,
				text: task.Name,
				start_date: start, //.substring(0, 10)
				end_date: end, //substring(0, 10)
				type:
					task.Type === 'Task' || task.Type === 'Todo' ? gantt.config.types.task : task.Type === 'Milestone' ? gantt.config.types.milestone : gantt.config.types.project,
				duration: task.Duration,
				progress: task.Progress,
				parent: task._isRoot ? null : task.IDParent,
				open: task.IsOpen,
				avatar_owner: task.AvatarOwner,
				full_name_owner: task._Staff?.FullName ?? '',
				_task: task,
			};
		});

		let links: Link[] = this.linksData?.map((link: any) => {
			return {
				id: link.Id,
				source: link.Source,
				target: link.Target,
				type: link.Type,
			};
		});

		if (data.length === 0) {
			return;
		}

		gantt.clearAll();
		this.todayMarker = gantt.addMarker({
			start_date: new Date(),
			css: 'today',
			text: 'Today',
		});

		gantt.parse({ data, links });

		gantt.eachTask((task) => {
			task.$open = true;
		});

		gantt.refreshData();
		gantt.setSizes();
		//gantt.render();
	}

	@Output() openTask = new EventEmitter();
	onOpenTask(task) {
		this.openTask.emit(task);
	}

	autoCalculateLink() {
		let currentLinks: any[] = gantt.getLinks();
		let linksUpdate: any[] = [];
		let linksDelete: any[] = [];
		//ST (source, target)
		let processedSTPairs: any[] = [];

		currentLinks
			.map((link: any) => {
				let sourceTask: any = gantt.getTask(link.source);
				let targetTask: any = gantt.getTask(link.target);
				let priority = this.calculatePriority(sourceTask, targetTask);
				let existingLink: any = gantt.getLink(link.id);
				let currentSTPair = [sourceTask?.id, targetTask?.id];
				if (!sourceTask || !targetTask) {
					linksDelete.push(link);
				} else {
					if (this.checkExistLink(currentSTPair, processedSTPairs)) {
						linksDelete.push(link);
					} else {
						if (existingLink && existingLink.type !== priority.toString() && priority !== -1) {
							link.type = priority.toString();
							linksUpdate.push(link);
						} else if (priority === -1) {
							linksDelete.push(link);
						}
					}
					processedSTPairs.push(currentSTPair);
				}
				return null;
			})
			.filter((link) => link !== null);

		if (this.submitAttempt == false) {
			this.submitAttempt = true;
			this.env
				.showPrompt('Bạn có chắc muốn sắp xếp lại các liên kết không?', null, '')
				.then((_) => {
					let obj = {
						LinksUpdate: linksUpdate,
						LinksDelete: linksDelete.map((link) => link.id),
					};
					this.pageProvider.commonService
						.connect('POST', 'PM/TaskLink/AutoCalculateLink', obj)
						.toPromise()
						.then((data: any) => {
							//render event
							this.loadDataGantt.emit();
							this.submitAttempt = false;
						})
						.catch((er) => {
							this.submitAttempt = false;
						});
				})
				.catch((er) => {
					this.submitAttempt = false;
				});
		}
	}

	private checkExistLink(currentSTPair: any[], processedSTPairs: any[]): boolean {
		return processedSTPairs.some((d) => (d[0] === currentSTPair[0] && d[1] === currentSTPair[1]) || (d[0] === currentSTPair[1] && d[1] === currentSTPair[0]));
	}

	private calculatePriority(sourceTask, targetTask) {
		if (!sourceTask || !targetTask) return -1;

		if (sourceTask.end_date <= targetTask.start_date) {
			// FS: Finish-to-Start
			return 0;
		}
		if (sourceTask.start_date >= targetTask.start_date) {
			// SS: Start-to-Start
			return 1;
		}
		if (sourceTask.end_date <= targetTask.end_date) {
			// FF: Finish-to-Finish
			return 2;
		}
		if (sourceTask.start_date >= targetTask.end_date) {
			// SF: Start-to-Finish
			return 3;
		}

		return -1;
	}

	updateTask(task: Task): Promise<void> {
		let _task = this.items.find((d) => d.Id == task.id);
		_task.StartDate = task.start_date;
		_task.EndDate = task.end_date;
		_task.Progress = task.progress;
		_task.Duration = task.duration;

		return new Promise((resolve, reject) => {
			if (this.submitAttempt == false) {
				this.submitAttempt = true;
				this.pageProvider
					.save(_task)
					.then((savedItem: any) => {
						this.env.showMessage('Saving completed!', 'success');
						resolve(savedItem.Id);
						this.submitAttempt = false;
					})
					.catch((err) => {
						this.env.showMessage('Cannot save, please try again', 'danger');
						this.submitAttempt = false;
						reject(err);
					});
			}
		});
	}

	createLink(link: Link): Promise<Link> {
		let idBefore = link.id;
		link.id = 0;
		return new Promise((resolve, reject) => {
			if (this.submitAttempt == false) {
				this.submitAttempt = true;
				this.taskLinkService
					.save(this.formatLink(link))
					.then((data: any) => {
						//delete library link create
						gantt.deleteLink(idBefore);
						const newLink = {
							id: data.Id,
							source: link.source,
							target: link.target,
							type: link.type,
						};
						//add new
						gantt.addLink(newLink);
						this.env.showMessage('Saving completed!', 'success');
						this.submitAttempt = false;
					})
					.catch((err) => {
						this.env.showMessage('Cannot save, please try again', 'danger');
						this.submitAttempt = false;
						reject(err);
					});
			}
		});
	}

	updateLink(link: Link): Promise<void> {
		return new Promise((resolve, reject) => {
			if (this.submitAttempt == false) {
				this.submitAttempt = true;
				this.taskLinkService
					.save(this.formatLink(link))
					.then((data: any) => {
						this.env.showMessage('Saving completed!', 'success');
						this.submitAttempt = false;
					})
					.catch((err) => {
						this.env.showMessage('Cannot save, please try again', 'danger');
						this.submitAttempt = false;
						reject(err);
					});
			}
		});
	}

	deleteLink(id: number): Promise<void> {
		let link = gantt.getLink(id);
		return new Promise((resolve, reject) => {
			if (this.submitAttempt == false) {
				this.submitAttempt = true;
				this.taskLinkService
					.delete(this.formatLink(link))
					.then(() => {
						this.env.showMessage('Deleted!', 'success');
						gantt.deleteLink(id);
						this.submitAttempt = false;
					})
					.catch((err) => {
						this.env.showMessage('Cannot save, please try again', 'danger');
						this.submitAttempt = false;
						reject(err);
					});
			}
		});
	}

	formatLink(e) {
		const link = {
			Code: '',
			Type: e.type,
			Source: e.source,
			Target: e.target,
			Remark: '',
			Sort: null,
			IsDisabled: null,
			IsDeleted: null,
			CreatedBy: '',
			ModifiedBy: '',
			CreatedDate: '',
			ModifiedDate: '',
			Id: e.id,
			Name: e?.text,
		};
		return link;
	}
}
