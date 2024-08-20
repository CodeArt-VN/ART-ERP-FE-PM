import { ChangeDetectorRef, Component, ViewEncapsulation } from '@angular/core';
import {
  NavController,
  ModalController,
  AlertController,
  LoadingController,
  PopoverController,
} from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { PM_SpaceProvider } from 'src/app/services/static/services.service';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CommonService } from 'src/app/services/core/common.service';
import { SpaceStatusModalPage } from '../space-status-modal/space-status-modal.page';

@Component({
  encapsulation: ViewEncapsulation.None,
  selector: 'app-space-detail',
  templateUrl: 'space-detail.page.html',
  styleUrls: ['space-detail.page.scss'],
})
export class SpaceDetailPage extends PageBase {
  groupStatus = [
    {
      Name: 'Active',
    },
    {
      Name: 'Done',
    },
    {
      Name: 'Closed',
    },
  ];

  viewLists : any = [
    {
      Code: 'List',
      Name: 'List',
      Icon: 'list',
      Enable: true,
    },
    {
      Code: 'Board',
      Name: 'Board',
      Icon: 'layers-outline',
      Enable: false,
    },
    {
      Code: 'Gantt',
      Name: 'Gantt',
      Icon: 'filter-outline',
      Enable: false,
    },
  ];

  constructor(
    public pageProvider: PM_SpaceProvider,
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
  ) {
    super();
    this.pageConfig.isDetailPage = true;
    this.formGroup = formBuilder.group({
      IDBranch: new FormControl({ value: null, disabled: false }),
      Id: new FormControl({ value: '', disabled: true }),
      Code: ['', Validators.required],
      Name: ['', Validators.required],
      Icon: [''],
      Color: [''],
      Remark: [''],
      ViewConfig: [''],
      IsDisabled: new FormControl({ value: '', disabled: true }),
      IsDeleted: new FormControl({ value: '', disabled: true }),
      CreatedBy: new FormControl({ value: '', disabled: true }),
      CreatedDate: new FormControl({ value: '', disabled: true }),
      ModifiedBy: new FormControl({ value: '', disabled: true }),
      ModifiedDate: new FormControl({ value: '', disabled: true }),
      SpaceStatus: this.formBuilder.array([]),
      DeletedSpaceStatus: [[]],
    });
  }

  loadedData(event?: any) {
    if (this.item.ViewConfig) {
      const viewConfigList = JSON.parse(this.item.ViewConfig);
      this.viewLists.forEach((e) => {
        const view = viewConfigList.Views.find((f) => f.Layout.View.Name == e.Code);
        if (view && view.Layout?.View?.IsActive) {
          e.Enable = true;
        }else {
          e.Enable = false;
        }
      });
      this.viewLists = this.viewLists.filter((e: any) => !e.IsConfig);
      //push view in config
      viewConfigList.Views.forEach((view) => {
        const existView = this.viewLists.find((e) => e.Code == view.Layout.View.Name);
        if (!existView) {
          this.viewLists.push({
            Code: view.Layout.View.Type,
            Name: view.Layout.View.Name || view.Layout.View.Type, 
            Icon: view.Layout.View.Icon || 'pricetag-outline',
            Enable: view.Layout.View.IsActive || false,
            IsConfig: true
          });
        }
      });
    }
    super.loadedData(event);
    this.patchSpaceStatusValue();
  }

  private patchSpaceStatusValue() {
    this.formGroup.controls.SpaceStatus = new FormArray([]);
    if (this.item.SpaceStatus?.length) {
      for (let i of this.item.SpaceStatus) {
        this.addSpaceStatusValue(i);
      }
    }
  }

  private addSpaceStatusValue(line, markAsDirty = false) {
    let groups = <FormArray>this.formGroup.controls.SpaceStatus;
    let group = this.formBuilder.group({
      IDSpace: [line.IDSpace],
      IDParent: [line.IDParent],
      Type: [line.Type],
      Id: [line.Id],
      Code: [line.Code, Validators.required],
      Name: [line.Name, Validators.required],
      Remark: [line.Remark],
      Icon: [line.Icon],
      Sort: [line.Sort],
      Color: [line.Color],
    });

    groups.push(group);

    if (markAsDirty) {
      group.get('Code').markAsDirty();
      group.get('Name').markAsDirty();
      group.get('Remark').markAsDirty();
      group.get('Icon').markAsDirty();
      group.get('Sort').markAsDirty();
      group.get('Color').markAsDirty();
      group.get('Type').markAsDirty();
    }
  }

  doReorder(ev, groups, nameGroup) {
    groups = ev.detail.complete(groups);
    groups = groups.filter((f) => f.value.Type == nameGroup);
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      g.controls.Sort.setValue(i + 1);
      g.controls.Sort.markAsDirty();
    }
    this.saveChange();
  }

  viewEnable(itemView) {
    if (itemView) {
      itemView.Enable = !itemView.Enable;
    }
    this.convertJsonViewList();
    this.saveChange();
  }

  convertJsonViewList() {
    let config = {
      Views: []
    };
    let data = this.viewLists.map((e) => ({
      Layout: {
        View: {
          Name: e.Name,
          Type: e.Code,
          Icon: '',
          Color: '',
          IsPinned: false,
          IsDefault: false,
          IsActive: e.Enable,
        }
      }
    }));
    config.Views = data;
    console.log(config);
    
    this.formGroup.get('ViewConfig').setValue(JSON.stringify(config));
    this.formGroup.get('ViewConfig').markAsDirty();
  }

  async showModalStauts(formGroup, name) {
    let item = {
      Id: 0,
      IDSpace: this.item.Id,
      Type: name,
      Sort: 0,
    };
    if (formGroup) {
      item = formGroup.value;
    }

    const modal = await this.modalController.create({
      component: SpaceStatusModalPage,
      componentProps: {
        item: item,
      },
      cssClass: 'my-custom-class',
    });
    await modal.present();
    const { data, role } = await modal.onWillDismiss();

    if (role === 'confirm') {
      if (data.Id == 0) {
        this.addSpaceStatusValue(data, true);
      } else {
        formGroup.get('Code').setValue(data.Code);
        formGroup.get('Color').setValue(data.Color);
        formGroup.get('Icon').setValue(data.Icon);
        formGroup.get('Name').setValue(data.Name);
        formGroup.get('Remark').setValue(data.Remark);
        formGroup.get('Sort').setValue(data.Sort);
        formGroup.get('Type').setValue(data.Type);

        formGroup.get('Code').markAsDirty();
        formGroup.get('Color').markAsDirty();
        formGroup.get('Icon').markAsDirty();
        formGroup.get('Name').markAsDirty();
        formGroup.get('Remark').markAsDirty();
        formGroup.get('Sort').markAsDirty();
        formGroup.get('Type').markAsDirty();
      }
      this.saveChange();
    }
  }

  removeStatus(g, id) {
    this.env
      .showPrompt('Bạn có chắc muốn xóa không?', null, 'Xóa Status')
      .then((_) => {
        this.item.SpaceStatus = this.item.SpaceStatus.filter((f) => f.Id != id);
        let deletedSpaceStatus = this.formGroup.get('DeletedSpaceStatus').value;
        let deletedId = g.controls.Id.value;
        deletedSpaceStatus.push(deletedId);
        this.formGroup.get('DeletedSpaceStatus').setValue(deletedSpaceStatus);
        this.formGroup.get('DeletedSpaceStatus').markAsDirty();
        this.saveChange();
      })
      .catch((_) => {});
  }

  filterStatusType(item, statusType) {
    return item.filter((f) => f.value.Type == statusType);
  }

  async saveChange() {
    this.saveChange2();
  }

  savedChange(savedItem?: any, form?: FormGroup<any>): void {
    super.savedChange(savedItem, form);
    this.item = savedItem;
    this.loadedData();
  }
}
