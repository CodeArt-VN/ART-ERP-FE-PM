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
    styleUrls: ['gantt.page.scss']
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
        public location: Location,
    ) {
        super();
    }

    preLoadData(event?: any): void {
        super.loadedData(event);
    }

    ionViewDidEnter() {
        super.ionViewDidEnter();

        gantt.config.date_format = '%Y-%m-%d %H:%i';
        gantt.init(this.ganttContainer.nativeElement);
        Promise.all([this.taskService.get(), this.linkService.get()])
            .then(([data, links]) => {
                gantt.parse({ data, links });
            });
    }

  
}
