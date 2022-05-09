import { Component, OnInit, OnDestroy, NgZone, ViewChild, ElementRef } from '@angular/core';
import { IonRouterOutlet } from '@ionic/angular';
import { StorageService } from 'src/app/providers/storage.service';
import { GeneralService } from 'src/app/providers/general.service';
import { HttpService } from 'src/app/providers/http.service';
import * as Leaflet from 'leaflet';
import { Geolocation } from '@capacitor/geolocation';
import { GlobaldataService } from 'src/app/providers/globaldata.service';
import * as GeoSearch from 'leaflet-geosearch';
import { InAppBrowser, InAppBrowserOptions } from '@awesome-cordova-plugins/in-app-browser/ngx';
const provider = new GeoSearch.OpenStreetMapProvider();
import DriftMarker from "leaflet-drift-marker";


@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit {
  @ViewChild('fileInput', { static: false }) fileInput: ElementRef;

  map: Leaflet.Map;
  tiles: any = undefined;

  showBuyBtn: boolean = false;

  selectedBoxs = [];
  soldBoxes = [];
  myBoxs = [];

  user_id = GlobaldataService.userObject != undefined ? GlobaldataService.userObject.id : null;

  imgSelection: boolean = false;
  boxImgs = [];
  selectedImg: string = undefined;
  showUplaodedImage: boolean = false;

  showEditor: boolean = false;

  qEditor: any;

  avatar: string;
  myMarker: any;
  otherMarkers = [];

  constructor(
    public routerOutlet: IonRouterOutlet,
    public storage: StorageService,
    public general: GeneralService,
    public http: HttpService,
    private iab: InAppBrowser,
    private zone: NgZone
  ) { }

  ngOnInit() { }

  ionViewWillEnter() {
    this.avatar = GlobaldataService.userObject != undefined ? GlobaldataService.userObject.avatar != null ? GlobaldataService.userObject.avatar : 'https://leafletdemo.mewebe.net/API/assets/user/avataaars.png' : 'https://leafletdemo.mewebe.net/API/assets/user/avataaars.png';
    if (this.tiles != undefined) {
      this.map.removeLayer(this.tiles);
      this.imgSelection = false;
      this.selectedImg = '';
      this.soldBoxes = [];
      this.selectedBoxs = [];
      this.myBoxs = [];
      this.tiles = undefined;
    }
  }

  ionViewWillLeave() {
    if (this.tiles != undefined) {
      this.map.removeLayer(this.tiles);
      this.imgSelection = false;
      this.selectedImg = '';
      this.soldBoxes = [];
      this.selectedBoxs = [];
      this.myBoxs = [];
      this.tiles = undefined;
    }
  }

  ionViewDidEnter() {
    this.getSoldBox();
    this.getBoxImgs();
    this.loadMap();
    this.map.on('zoomend', (res) => {
      if (res.target._zoom == 15) {
        this.showBuyBtn = true;
      } else {
        this.showBuyBtn = false;
        this.addMarker();
        this.addOtherMarkers();
        if (this.tiles != undefined) {
          this.selectedBoxs = [];
          this.myBoxs = [];
          this.map.removeLayer(this.tiles);
          this.tiles = undefined;
        }
      }
    });

  }

  showGrid() {
    if (this.tiles == undefined) {
      this.setGrid(this.map);
      if (this.myMarker != undefined) {
        this.map.removeLayer(this.myMarker);
      }
      if (this.otherMarkers.length > 0) {
        this.otherMarkers.map((marker) => {
          this.map.removeLayer(marker)
        })
      }
    }
  }

  getSoldBox() {
    this.http.get2('GetSelectedTiles', true).subscribe((res: any) => {
      this.general.stopLoading();
      if (res.status == true) {
        this.soldBoxes = res.data.tiles;
      }
    },
      (e) => {
        this.general.stopLoading();
        console.log(e)
      })
  }

  async loadMap() {
    if (this.map !== undefined) {
      return
    }
    this.map = Leaflet.map('mapId').setView([0, 0], 1);
    //Leaflet.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}?access_token={accessToken}', {
    Leaflet.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
      attribution: 'Buy / Customise land',
      maxZoom: 15,
      id: 'mapbox/streets-v11',
      accessToken: 'pk.eyJ1IjoiaWRldmUiLCJhIjoiY2wxZ2o1cnlhMWFjbTNkcGNpbGZ3djI1bSJ9.H-6HJziV9Wu75UT4gQu5Bw',
    }).addTo(this.map);
    this.map.attributionControl.setPrefix('FlatMeta.io');

    const coordinates = await Geolocation.getCurrentPosition();
    this.map.flyTo([coordinates.coords.latitude, coordinates.coords.longitude], 15);

    let allowZooms = [5, 10, 15];
    this.map.setView = function (center, zoom, options) {
      if ((zoom) && (allowZooms.indexOf(zoom) === -1)) {
        let ixCurZoom = allowZooms.indexOf(this._zoom);
        let dir = (zoom > this._zoom) ? 1 : -1;
        if (allowZooms[ixCurZoom + dir]) {
          zoom = allowZooms[ixCurZoom + dir];
        } else {
          return this;
        }
      }
      return Leaflet.Map.prototype.setView.call(this, center, zoom, options);
    }
    this.addMarker(); //add my marker
    this.addOtherMarkers() //add other prople marker

    setTimeout(() => {
      const search = GeoSearch.GeoSearchControl({
        provider: provider,
        style: 'bar',
        showMarker: false,
        searchLabel: 'Search Map',
        retainZoomLevel: true
      });
      this.map.addControl(search);
    }, 1000)
  }

  async addMarker() {
    const coordinates = await Geolocation.getCurrentPosition();
    const icon = Leaflet.icon({
      iconUrl: this.avatar,
      iconSize: [50, 50], // size of the icon
      popupAnchor: [13, 0],
    });

    let name = GlobaldataService.userObject != undefined ? GlobaldataService.userObject.full_name : 'No name'
    let customPopup = `
      <p>Hello i am ${name}<p>
      <p>i am Selling my Place you can Buy it. 
      <div class="flex">
        <ion-button size="small">Message</ion-button>
        <ion-button size="small">Request</ion-button>
      </div>      
    `;

    // specify popup options 
    let customOptions = {
      'maxWidth': '400',
      'width': '200',
      'className': 'popupCustom',
    }
    if (this.myMarker != undefined) {
      this.map.removeLayer(this.myMarker);
    }
    this.myMarker = new DriftMarker([coordinates.coords.latitude, coordinates.coords.longitude], {
      draggable: true,
      icon: icon
    })//@ts-ignore
      .bindPopup(customPopup, customOptions).addTo(this.map);

    const onMapClick = (e) => {
      this.myMarker.slideTo(e.latlng, { duration: 1500 });
      // Update marker on changing it's position
      // marker.on('dragend', function (ev) {
      //   let chagedPos = ev.target.getLatLng();
      //   this.bindPopup(chagedPos.toString()).openPopup();
      // });
    }
    this.map.on('click', onMapClick);
  }

  addOtherMarkers() {
    let locations = [
      ["LOCATION_1", 24.902001, 67.075012],
      ["LOCATION_2", 24.902546, 67.075817],
      ["LOCATION_3", 24.902906, 67.074192],
      ["LOCATION_4", 24.903587, 67.075377],
      ["LOCATION_5", 24.895965, 67.081478]
    ];

    if (this.otherMarkers.length > 0) {
      this.otherMarkers.map((marker) => {
        this.map.removeLayer(marker)
      })
    }

    for (let i = 0; i < locations.length; i++) {
      const icon = Leaflet.icon({
        iconUrl: 'https://leafletdemo.mewebe.net/API/assets/user/avataaars.png',
        iconSize: [50, 50], // size of the icon
        popupAnchor: [13, 0],
      });
      let marker = new DriftMarker([locations[i][1], locations[i][2]], {
        draggable: false,
        icon: icon
      })//@ts-ignore
        .addTo(this.map);

      this.otherMarkers.push(marker);
    }
  }

  setGrid(m) {
    let that = this;
    this.tiles = new Leaflet.GridLayer({
      tileSize: 40,
      opacity: 0.8,
      updateWhenZooming: false,
      updateWhenIdle: false,
      minNativeZoom: 10,
      maxNativeZoom: 15,
    });
    this.tiles.createTile = function (coords) {
      let tile = Leaflet.DomUtil.create('canvas', 'leaflet-tile');
      let ctx = tile.getContext('2d');
      let size = this.getTileSize();
      tile.width = size.x;
      tile.height = size.y;

      // calculate projection coordinates of top left tile pixel
      var nwPoint = coords.scaleBy(size)
      nwPoint.clientHeight = 80;
      nwPoint.clientWidth = 80;
      // calculate geographic coordinates of top left tile pixel
      var nw = m.unproject(nwPoint, coords.z);
      let fb = undefined;
      fb = that.soldBoxes.find(e => nw.lat == e.lat && nw.lng == e.lng);
      if (fb != undefined) {
        let mb = undefined;
        mb = that.soldBoxes.find(e => nw.lat == e.lat && nw.lng == e.lng && e.user_id == (GlobaldataService.userObject != undefined ? GlobaldataService.userObject.id : null));
        if (mb != undefined) {
          if (mb.img != '') {
            let im = new Image();
            im.src = mb.img;
            setTimeout(() => {
              ctx.drawImage(im, 0, 0, 40, 40);
            }, 250)
            ctx.strokeStyle = 'transparent';
          } else {
            ctx.strokeStyle = 'green'; // if my box
          }
        } else {
          ctx.strokeStyle = 'red'; // if other user box
        }
      } else {
        ctx.strokeStyle = 'grey'; // available box
      }
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(size.x - 1, 0);
      ctx.lineTo(size.x - 1, size.y - 1);
      ctx.lineTo(0, size.y - 1);
      ctx.closePath();
      ctx.stroke();
      tile.addEventListener('click', (e) => {
        let cb = undefined;
        cb = that.soldBoxes.find(c => nw.lat == c.lat && nw.lng == c.lng);

        if (cb != undefined) {
          //check here if this box exists in my bought boxes add orange class or else unselect it
          let mb = undefined;
          mb = that.soldBoxes.find(d => nw.lat == d.lat && nw.lng == d.lng && d.user_id == (GlobaldataService.userObject != undefined ? GlobaldataService.userObject.id : null));
          if (mb != undefined) { // checking if box i bought by me
            let m = undefined;
            m = that.myBoxs.filter(h => nw.lat == h.lat && nw.lng == h.lng);
            if (m.length != 0) {
              let i = that.myBoxs.findIndex(i => (i.lat == nw.lat && i.lng == nw.lng));
              that.myBoxs.splice(i, 1);
              e.srcElement.classList.toggle('my-box');
            } else {
              e.srcElement.classList.toggle('my-box');
              that.qEditor = cb.data;
              that.myBoxs.push(cb);
            }
          } else {
            let pop = undefined;
            pop = that.soldBoxes.find(d => nw.lat == d.lat && nw.lng == d.lng);
            const Micon = Leaflet.icon({
              iconUrl: 'http://leafletdemo.mewebe.net/API/assets/img/map-icon.png',
              popupAnchor: [13, 0],
            });
            let customPopup = pop.data;

            // specify popup options 
            let customOptions = {
              'maxWidth': '400',
              'width': '200',
              'className': 'popupCustom',
            }
            var marker = Leaflet.marker([nw.lat, nw.lng], { icon: Micon });
            marker.bindPopup(customPopup, customOptions).addTo(m);
            setTimeout(() => {
              marker.fire('click');
            })
          }
        } else {
          let r = undefined;
          r = that.selectedBoxs.filter(f => nw.lat == f.lat && nw.lng == f.lng);
          if (r.length != 0) {
            let i = that.selectedBoxs.findIndex(g => (g.lat == nw.lat && g.lng == nw.lng));
            that.selectedBoxs.splice(i, 1);
            e.srcElement.classList.toggle('border-show');
          } else {
            e.srcElement.classList.toggle('border-show');
            that.selectedBoxs.push({ lat: nw.lat, lng: nw.lng, img: null });
          }
        }
      });
      return tile;
    }
    this.tiles.addTo(m);

  }

  removeSelectedBoxes() {
    this.map.removeLayer(this.tiles);
    this.imgSelection = false;
    this.selectedImg = '';
    this.selectedBoxs = [];
    this.myBoxs = [];
    this.tiles = undefined;
    this.showUplaodedImage = false;
    setTimeout(() => {
      this.setGrid(this.map);
    }, 250)
  }

  buyNow() {
    if (GlobaldataService.userObject == undefined) {
      this.general.presentToast('Please Login to Continue');
      this.general.goToPage('login');
    } else {
      let amt = this.selectedBoxs.length * 0.1;
      this.makePayment(amt);
    }
  }

  /** Remove map when we have multiple map object */
  ngOnDestroy() {
    this.map.remove();
  }

  getBoxImgs() {
    this.http.get2('BoxImages', false).subscribe((res: any) => {
      if (res.status == true) {
        this.boxImgs = res.data;
      }
    }, (e) => {
      console.log(e)
    })
  }

  confirmImg() {
    this.myBoxs.forEach(e => {
      e.img = this.selectedImg;
    })
    this.http.post2('AddTileImage', this.myBoxs, true).subscribe((res: any) => {
      this.general.stopLoading();
      if (res.status == true) {
        this.getSoldBox();
        this.general.presentToast('Boxes bought successfully!');
        this.map.removeLayer(this.tiles);
        this.imgSelection = false;
        this.selectedImg = '';
        this.soldBoxes = [];
        this.selectedBoxs = [];
        this.myBoxs = [];
        this.tiles = undefined;
        this.showUplaodedImage = false;
        setTimeout(() => {
          this.setGrid(this.map);
        }, 2000)
      }
    }, (e) => {
      console.log(e)
    })

  }

  makePayment(amt) {
    const options: InAppBrowserOptions = {
      zoom: 'no',
      location: 'no',
      toolbar: 'no',
      fullscreen: 'yes',
      clearcache: 'no',
      clearsessioncache: 'no',
      cleardata: 'no',
      hardwareback: 'yes',
      useWideViewPort: 'no',
      enableViewportScale: 'yes',
      presentationstyle: 'fullscreen'
    };

    const browser = this.iab.create('https://cocoon-paypal.herokuapp.com/pay/' + amt, '_blank', options);

    browser.on('loadstart').subscribe((res) => {

      let uri = res.url.split('?');
      if (uri[0] == 'https://cocoon-paypal.herokuapp.com/success') {
        browser.close();
        this.makeBuy();
      }
    }, err => {
      console.error(err);
    });
  }

  makeBuy() {
    let save = {
      boxs: this.selectedBoxs,
      user_id: GlobaldataService.userObject.id,
    };
    this.http.post2('AddTiles', save, true).subscribe((res: any) => {
      this.general.stopLoading()
      if (res.status == true) {
        this.getSoldBox();
        this.general.presentToast('Boxes bought successfully!');
        this.map.removeLayer(this.tiles);
        this.soldBoxes = [];
        this.selectedBoxs = [];
        this.tiles = undefined;
        setTimeout(() => {
          this.setGrid(this.map);
        }, 2000)
      }
    },
      (e) => {
        this.general.stopLoading()
        console.log(e)
      })
  }

  chooseFile() {
    this.fileInput.nativeElement.click();
  }

  choosePhoto = async (e) => {
    if (e.target.files.length > 0) {
      for (let i = 0; i < e.target.files.length; i++) {
        this.http.uploadImages(e.target.files[i], 'UploadImage').subscribe((res: any) => {
          if (res.status == true) {
            this.selectedImg = res.data;
            this.showUplaodedImage = true;
            this.general.presentToast('Image Uploaded!')
          } else {
            this.general.presentToast(res.data.message);
          }
        })
      }
    }
  }

  addToCart() {
    if (GlobaldataService.userObject == undefined) {
      this.general.presentToast('Please Login to Continue!')
      return
    }
    let save = {
      boxs: this.selectedBoxs,
      user_id: GlobaldataService.userObject.id,
    };

    this.http.post2('AddToCart', save, true).subscribe((res: any) => {
      this.general.stopLoading();
      if (res.status == true) {
        this.getSoldBox();
        this.general.presentToast('Boxes added to cart successfully!');
        this.map.removeLayer(this.tiles);
        this.soldBoxes = [];
        this.selectedBoxs = [];
        this.tiles = undefined;
        setTimeout(() => {
          this.setGrid(this.map);
        }, 2000)
      }

    }, (e) => {
      this.general.stopLoading();
      console.log(e)
    })
  }

  editorSubmit() {
    this.myBoxs.forEach(e => {
      e.data = this.qEditor;
    });
    this.http.post2('AddTileContent', this.myBoxs, true).subscribe((res: any) => {
      this.general.stopLoading();
      if (res.status == true) {
        this.getSoldBox();
        this.general.presentToast('Boxes Updated successfully!');
        this.map.removeLayer(this.tiles);
        this.imgSelection = false;
        this.selectedImg = '';
        this.soldBoxes = [];
        this.selectedBoxs = [];
        this.myBoxs = [];
        this.tiles = undefined;
        this.showEditor = false;
        setTimeout(() => {
          this.setGrid(this.map);
        }, 2000)
      }
    }, (e) => {
      console.log(e)
    })
  }

  swipeImg() {
    let r = this.general.swapArray(this.myBoxs, 0, 1);
    this.http.post2('SwapImages', r, true).subscribe((res: any) => {
      this.general.stopLoading();
      if (res.status == true) {
        this.getSoldBox();
        this.general.presentToast('Box Image Update successfully!');
        this.map.removeLayer(this.tiles);
        this.imgSelection = false;
        this.selectedImg = '';
        this.soldBoxes = [];
        this.selectedBoxs = [];
        this.myBoxs = [];
        this.tiles = undefined;
        this.showUplaodedImage = false;
        setTimeout(() => {
          this.setGrid(this.map);
        }, 2000)
      }
    }, (e) => {
      console.log(e)
    })
  }

}
