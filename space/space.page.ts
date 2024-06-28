import { Component, ViewEncapsulation } from '@angular/core';
import { AlertController, LoadingController, ModalController, NavController, PopoverController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { EnvService } from 'src/app/services/core/env.service';
import {
  BRA_BranchProvider,
  PM_SpaceProvider
} from 'src/app/services/static/services.service';

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
