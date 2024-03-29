import { Component, NgZone } from '@angular/core';
import { GeneralService } from './providers/general.service';
import { StorageService } from './providers/storage.service';
import { Platform, AlertController } from '@ionic/angular';
import { GlobaldataService } from './providers/globaldata.service';
import { EventsService } from './providers/events.service';
import { HttpService } from './providers/http.service';
import { App } from '@capacitor/app';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {

  darkMode: boolean = false;
  profile: any = undefined;

  pages = [
    {
      title: "My Cart",
      url: 'flatmeta/cart',
      goWithoutLogin: false,
    },
    {
      title: "My Places",
      url: 'flatmeta/myplaces',
      goWithoutLogin: false,
    },
    {
      title: 'Recent Purchased Places',
      url: 'flatmeta/recentpurchases',
      goWithoutLogin: true,
    },
    {
      title: "Friend Requests",
      url: 'flatmeta/friendrequest',
      goWithoutLogin: false,
    },
    {
      title: "Profile",
      url: 'flatmeta/profile',
      goWithoutLogin: false,
    },
    {
      title: 'Open Source Contribution',
      url: 'flatmeta/opensource',
      goWithoutLogin: true,
    }
  ];

  constructor(
    public general: GeneralService,
    public alertController: AlertController,
    private platform: Platform,
    private storage: StorageService,
    public events: EventsService,
    public http: HttpService,
    private zone: NgZone
  ) {
    this.initializeApp();
    this.events.receiveLogin().subscribe((res: any) => {
      this.profile = res;
    })
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.getLoginUser();
      this.checkdarkMode();
      App.addListener('backButton', data => {
        if(data.canGoBack){
          this.zone.run(()=>{
            this.general.goToPage('flatmeta/home');
          })
        }
      });
    });
  }

  async getLoginUser() {
    let res: any = await this.storage.getObject('login_token');
    if (res != null) {
      GlobaldataService.loginToken = res;
      this.getUserDetails();
    } else {
      this.storage.removeItem('userObject');
      this.storage.removeItem('login_token');
    }
  }
  
  goTo(p){
    if(p.goWithoutLogin){
      this.general.goToPage(p.url)
    }else{
      if(this.profile != undefined){
        this.general.goToPage(p.url)
      }else{
        this.general.goToPage('flatmeta/login')
        this.general.presentToast('Please Login to continue!');
      }
    }

  }

  getUserDetails() {
    this.http.get('getuserbytoken', false).subscribe((res: any) => {
      if (res.status == true) {
        GlobaldataService.userObject = res.data;
        this.storage.setObject('userObject', res.data);
        this.events.publishLogin(res.data) 
      }
    }, (e) => {
      if(e.status == 401){
        this.general.presentToast('Please Login to Continue!')
      }
    })
  }

  checkdarkMode() {
    this.storage.getObject('darkMode').then((res) => {
      if (res != null) {
        let a: any = res;
        if (a == true) {
          this.darkMode = true;
          GlobaldataService.darkMode = true;
          this.storage.setObject('darkMode', a)
          document.body.classList.toggle('dark', a);
        } else {
          this.darkMode = false;
          GlobaldataService.darkMode = false;
          this.storage.setObject('darkMode', a)
          document.body.classList.toggle('dark', a);
        }
      }
    })
  }

  toggleTheme(e) {
    if (e.detail.checked) {
      this.darkMode = true;
      GlobaldataService.darkMode = true;
      this.storage.setObject('darkMode', true)
      document.body.classList.toggle('dark', e.detail.checked);
    } else {
      this.darkMode = false;
      GlobaldataService.darkMode = false;
      this.storage.setObject('darkMode', false)
      document.body.classList.toggle('dark', e.detail.checked);
    }
  }

  async logOut() {
    const alert = await this.alertController.create({
      header: 'Confirm!',
      message: 'Are you sure you want to Logout?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: (blah) => {
          }
        }, {
          text: 'Okay',
          handler: () => {
            this.storage.clear();
            this.storage.setObject('darkMode', this.darkMode)
            GlobaldataService.clearGobal();
            this.profile = undefined;
            this.general.goToPage('flatmeta/login');
            this.general.toggleMenu();
          }
        }
      ]
    });

    await alert.present();
  }


}
