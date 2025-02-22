import { Component, ElementRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider, WMS_ZoneProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { gantt } from 'dhtmlx-gantt';
import { LinkService, TaskService } from '../_services/task.service';

@Component({
	encapsulation: ViewEncapsulation.None,
	selector: 'app-gantt',
	templateUrl: 'gantt.page.html',
	styleUrls: ['gantt.page.scss'],
})
export class GanttPage extends PageBase {
	@ViewChild('gantt_here', { static: true }) ganttContainer!: ElementRef;
	constructor(
		private taskService: TaskService,
		private linkService: LinkService,

		public branchProvider: BRA_BranchProvider,
		public modalController: ModalController,
		public popoverCtrl: PopoverController,
		public alertCtrl: AlertController,
		public loadingController: LoadingController,
		public env: EnvService,
		public navCtrl: NavController,
		public location: Location
	) {
		super();
	}

	preLoadData(event?: any): void {
		super.loadedData(event);
	}

	ionViewDidEnter() {
		super.ionViewDidEnter();

		var holidays = [
			new Date(2023, 0, 1),
			new Date(2023, 0, 21),
			new Date(2023, 3, 16),
			new Date(2023, 3, 30), //CN
			new Date(2023, 4, 1),
			new Date(2023, 4, 2), //Nghỉ bù
			new Date(2023, 4, 12),
			new Date(2023, 4, 27),
			new Date(2023, 5, 16),
			new Date(2023, 6, 4),
			new Date(2023, 8, 2),
			new Date(2023, 9, 14),
			new Date(2023, 10, 28),
			new Date(2023, 11, 25),
		];

		for (var i = 0; i < holidays.length; i++) {
			gantt.setWorkTime({
				date: holidays[i],
				hours: false,
			});
		}

		gantt.config.grid_resize = true;
		gantt.config.scales = [
			{ unit: 'month', step: 1, format: '%F, %Y' },
			{ unit: 'day', step: 1, format: '%D %j/%n' }, //https://docs.dhtmlx.com/gantt/desktop__date_format.html
		];
		gantt.config.drag_timeline = {
			ignore: '.gantt_task_line, .gantt_task_link',
			useKey: false,
		};
		gantt.config.date_format = '%Y-%m-%d %H:%i';
		gantt.config.work_time = true;
		gantt.templates.timeline_cell_class = function (task, date) {
			if (!gantt.isWorkTime(date)) return 'week_end';
			return '';
		};

		//gantt.config.row_height = 25;
		gantt.init(this.ganttContainer.nativeElement);
		Promise.all([this.taskService.get(), this.linkService.get()]).then(([data, links]) => {
			gantt.parse({ data, links });
		});
	}
}
