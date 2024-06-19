import { Component, ChangeDetectorRef } from '@angular/core';
import {
  NavController,
  ModalController,
  NavParams,
  LoadingController,
  AlertController,
  PopoverController,
} from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import { PM_SpaceStatusProvider, SYS_FormProvider } from 'src/app/services/static/services.service';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { CommonService } from 'src/app/services/core/common.service';

@Component({
  selector: 'app-space-status-modal',
  templateUrl: './space-status-modal.page.html',
  styleUrls: ['./space-status-modal.page.scss'],
})
export class SpaceStatusModalPage extends PageBase {
  constructor(
    public pageProvider: PM_SpaceStatusProvider,
    public popoverCtrl: PopoverController,
    public env: EnvService,
    public navCtrl: NavController,
    public route: ActivatedRoute,
    public alertCtrl: AlertController,
    public formBuilder: FormBuilder,
    public cdr: ChangeDetectorRef,
    public loadingController: LoadingController,
    public commonService: CommonService,
    public modalController: ModalController,
    public navParams: NavParams,
  ) {
    super();
    this.pageConfig.isDetailPage = true;
    this.id = this.route.snapshot.paramMap.get('id');
    this.formGroup = formBuilder.group({
      IDSpace: [''],
      IDParent: [''],
      Type: [''],
      Id: [''],
      Code: ['', Validators.required],
      Name: ['', Validators.required],
      Remark: [''],
      Icon: [''],
      Sort: [''],
      Color: [''],
    });

    this.formGroup.get('Type').markAsDirty();
  }
  saveStatus() {
    if (!this.formGroup.valid) {
      this.env.showTranslateMessage('Please recheck information highlighted in red above', 'warning');
      return;
    }

    return this.modalController.dismiss(this.formGroup.getRawValue(), 'confirm');
  }
}
