import { Component, ElementRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import {
  BRA_BranchProvider,
  PM_SpaceProvider,
  PM_TaskLinkProvider,
  PM_TaskProvider,
} from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { gantt } from 'dhtmlx-gantt';
import { Link, Task } from '../_models/task';
import { TaskModalPage } from '../task-modal/task-modal.page';
import { environment } from 'src/environments/environment';

@Component({
  encapsulation: ViewEncapsulation.None,
  selector: 'app-space',
  templateUrl: 'space.page.html',
  styleUrls: ['space.page.scss'],
})
export class SpacePage extends PageBase {
  constructor(
    public pageProvider: PM_SpaceProvider,
    public branchProvider: BRA_BranchProvider,
    public modalController: ModalController,
    public popoverCtrl: PopoverController,
    public alertCtrl: AlertController,
    public loadingController: LoadingController,
    public env: EnvService,
    public navCtrl: NavController,
  ) {
    super();
  }
}
