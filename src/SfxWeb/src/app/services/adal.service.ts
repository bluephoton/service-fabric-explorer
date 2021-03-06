import { Injectable } from '@angular/core';
import { DataService } from './data.service';
import { RestClientService } from './rest-client.service';
import { Observable, Subscriber, of } from 'rxjs';
import { retry, map } from 'rxjs/operators';
import { AadMetadata } from '../Models/DataModels/Aad';
import * as AuthenticationContext from  "adal-angular";
import { adal } from 'adal-angular';

// declare var AuthenticationContext: adal.AuthenticationContextStatic;
let createAuthContextFn: adal.AuthenticationContextStatic = AuthenticationContext;

export class AdalConfig {
  apiEndpoint: string;
  clientId: string;
  resource: string;
  tenantId: string;
  redirectUri: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdalService {
  private context: adal.AuthenticationContext;
  public config: AadMetadata;
  public aadEnabled: boolean = false;
  
  constructor(private http: RestClientService) { }

  load(): Observable<adal.AuthenticationContext> {
    if(!!this.context){
      return of(this.context);
    }else{
      return this.http.getAADmetadata().pipe(map(data => {
        this.config = data;
        if(data.isAadAuthType){

          const protocol = window.location.protocol;
          const hostname = window.location.hostname;
          const port = window.location.port ? ":" + window.location.port :"";

          const location = `${protocol}//${hostname}${port}`;

          const config = {
            tenant: data.raw.metadata.tenant,
            clientId: data.raw.metadata.client,
            redirectUri: location,
            cacheLocation: 'localStorage',
        }
        this.context = new createAuthContextFn(config);
          this.aadEnabled = true;
        }
      }));
    }
  }

  login() {
    this.context.login();
  }
  logout() {
      this.context.logOut();
  }
  get authContext() {
      return this.context;
  }
  handleWindowCallback() {
      this.context.handleWindowCallback();
  }    
  public get userInfo() {

      return this.context.getCachedUser();
  }
  public get accessToken() {
      return this.context.getCachedToken(this.config.raw.metadata.client);
  }
  public get isAuthenticated(): boolean {
      return this.userInfo && this.accessToken;
  }

  public isCallback(hash: string) {
      return this.context.isCallback(hash);
  }

  public getLoginError() {
      return this.context.getLoginError();
  }

  public getAccessToken(endpoint: string, callbacks: (message: string, token: string) => any) {

      return this.context.acquireToken(endpoint, callbacks);
  }

  public acquireTokenResilient(resource: string): Observable<any> {
      return new Observable<any>((subscriber: Subscriber<any>) =>
          {
            this.context.acquireToken(resource, (message: string, token: string) => {
              if (token) {
                  subscriber.next(token);
              } else {
                  console.error(message)
                  subscriber.error(message);
              }
          })
          }
      ).pipe(retry(3));
  }
  
}
