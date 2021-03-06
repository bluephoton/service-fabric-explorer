﻿import { Observable, of } from 'rxjs';
import { mergeMap, map } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { ActionDialogComponent } from '../shared/component/action-dialog/action-dialog.component';
import { ComponentType } from '@angular/cdk/portal';

//-----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// Licensed under the MIT License. See License file under the project root for license information.
//-----------------------------------------------------------------------------

export class Action {
    private _running: boolean;

    public get running(): boolean {
        return this._running;
    }

    public get displayTitle(): string {
        return this._running ? this.runningTitle : this.title;
    }

    constructor(
        public name: string,
        public title: string,
        public runningTitle: string,
        protected execute: (...params: any[]) => Observable<any>,
        public canRun: () => boolean,
        public isAdvanced: boolean = false) {

        this._running = false;
    }

    public run(...params: any[]) {
       this.runInternal(() => null, () => null, params).subscribe();
    }

    public runWithCallbacks(success: (result: any) => void, error: (reason: string) => void, ...params: any[]): Observable<any> {
        return this.runInternal(success, error, params);
    }

    protected runInternal(success: (result: any) => void, error: (reason: string) => void, ...params: any[]): Observable<any> {
        
        if (this.canRun()) {
            this._running = true;
            const executing = this.execute();
            executing.pipe(map( ()=> {
                this._running = false;
            })).subscribe();
            return executing;

        }
    }
}

export class ActionWithDialog extends Action {
    /**
     * Creates an action with dialog support
     * @param name The action name
     * @param title The action display title
     * @param runningTitle The action display title when running
     * @param execute The execute function
     * @param canRun The query to see if the action is runnable
     * @param modalSettings The dialog settings
     * @param beforeOpen The function runs before dialog is opened
     */

    template = ActionDialogComponent;
    constructor(
        public dialog: MatDialog,
        public name: string,
        public title: string,
        public runningTitle: string,
        public execute: (...params: any[]) => Observable<any>,
        public canRun: () => boolean,
        public beforeOpen?: () => Observable<any>) {

        super(name, title, runningTitle, execute, canRun);
    }

    protected runInternal(success: (result: any) => void, error: (reason: string) => void, ...params: any[]): Observable<any> {
        if (this.canRun()) {
            return of(this.beforeOpen ? this.beforeOpen() : true).pipe(mergeMap(() => {
                let dialogRef = this.dialog.open(this.template, {data: this, panelClass: "mat-dialog-container-wrapper"});
                return dialogRef.afterClosed().pipe(mergeMap( (data: boolean) => {
                    if(data){
                        return super.runInternal(success, error, params);
                    }
                    return of(null)
                }))
            }));
        }else{
            return of(null);
        }
    }
}

export class ActionWithConfirmationDialog extends ActionWithDialog {
    constructor(
        public dialog: MatDialog,
        public name: string,
        public title: string,
        public runningTitle: string,
        public execute: (...params: any[]) => Observable<any>,
        public canRun: () => boolean,
        public confirmationDialogTitle?: string,
        public confirmationDialogMessage?: string,
        public confirmationKeyword?: string) {

        super(dialog, name, title, runningTitle, execute, canRun);
    }
}

export class IsolatedAction extends Action {
    constructor(
        public dialog: MatDialog,
        public name: string,
        public title: string,
        public runningTitle: string,
        public data: any,
        public template: ComponentType<any>,
        public canRun: () => boolean,
        public beforeOpen?: () => Observable<any>) {

        super(name, title, runningTitle, null, canRun);
    }


    protected runInternal(success: (result: any) => void, error: (reason: string) => void, ...params: any[]): Observable<any> {
        if (this.canRun()) {
            return (!!this.beforeOpen ? this.beforeOpen() : of(null)).pipe(mergeMap(() => {
                let dialogRef = this.dialog.open(this.template, {data: this, panelClass: "mat-dialog-container-wrapper"});
                return dialogRef.afterClosed()
            }));
        }else{
            return of(null);
        }
    }

}
