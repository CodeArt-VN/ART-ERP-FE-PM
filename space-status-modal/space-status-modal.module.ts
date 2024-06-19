import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ShareModule } from 'src/app/share.module';
import { SpaceStatusModalPage } from './space-status-modal.page';

const routes: Routes = [
  {
    path: '',
    component: SpaceStatusModalPage,
  },
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ShareModule,
    IonicModule,
    ReactiveFormsModule,
    ShareModule,
    RouterModule.forChild(routes),
  ],
  declarations: [SpaceStatusModalPage],
})
export class SpaceStatusModalPageModule {}
