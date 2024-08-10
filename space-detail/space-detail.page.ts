import { ChangeDetectorRef, Component, ElementRef, ViewChild, ViewEncapsulation } from '@angular/core';
import {
  NavController,
  ModalController,
  AlertController,
  LoadingController,
  PopoverController,
  ItemReorderEventDetail,
} from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider, PM_SpaceProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
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

  viewLists = [
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
      const ViewConfigList = JSON.parse(this.item.ViewConfig);
      this.viewLists.forEach((e) => {
        if (ViewConfigList.find((f) => e.Code == f.Code)) {
          e.Enable = true;
        }
      });
    }
    super.loadedData(event);
    this.patchSpaceStatusValue();
    //this.convertJsonViewList();
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
    let data = this.viewLists
      .filter((f) => f.Enable)
      .map((e) => {
        return {
          Code: e.Code,
          Name: e.Name,
        };
      });
    this.formGroup.get('ViewConfig').setValue(JSON.stringify(data));
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
