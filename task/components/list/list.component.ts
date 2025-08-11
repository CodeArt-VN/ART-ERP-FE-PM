import { Component, Input, ViewEncapsulation } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { BRA_BranchProvider, PM_TaskProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { PageBase } from 'src/app/page-base';
import { environment } from 'src/environments/environment';
import { lib } from 'src/app/services/static/global-functions';

@Component({
	selector: 'app-list',
	templateUrl: 'list.component.html',
	styleUrls: ['list.component.scss'],
	standalone: false,
})
export class ListComponent extends PageBase {
	@Input() items: any;
	@Input() page: any;
	@Input() statusList: any;
	@Input() typeList: any;
	
	itemsState: any = [];
	itemsView = [];
	isAllRowOpened = false;

	constructor(
		public pageProvider: PM_TaskProvider,
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


	loadedData(event) {
		this.items.forEach((i) => {
			i.Avatar = i._Staff?.Code ? environment.staffAvatarsServer + i._Staff?.Code + '.jpg' : 'assets/avartar-empty.jpg';
			i.Email = i._Staff?.Email ? i._Staff?.Email.replace(environment.loginEmail, '') : '';
			i.StatusText = lib.getAttrib(i.Status, this.statusList, 'Name', '--', 'Code');
			i.StatusColor = lib.getAttrib(i.Status, this.statusList, 'Color', 'dark', 'Code');
			i.TypeText = lib.getAttrib(i.Type, this.typeList, 'Name', '--', 'Code');
			i.TypeIcon = lib.getAttrib(i.Type, this.typeList, 'Icon', 'flash', 'Code');
		});
		this.buildFlatTree(this.items, this.itemsState, this.isAllRowOpened).then((resp: any) => {
			this.itemsState = resp;
		});
		super.loadedData(event);
	}
	
	toggleRowAll() {
		this.isAllRowOpened = !this.isAllRowOpened;
		this.itemsState.forEach((i) => {
			i.showdetail = !this.isAllRowOpened;
			this.toggleRow(this.itemsState, i, true);
		});
	}
}
