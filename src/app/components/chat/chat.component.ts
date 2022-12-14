import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { IonContent } from '@ionic/angular';
import { GeneralService } from 'src/app/providers/general.service';
import { HttpService } from 'src/app/providers/http.service';
import { GlobaldataService } from 'src/app/providers/globaldata.service';
import { Socket } from 'ngx-socket-io';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
})
export class ChatComponent implements OnInit {
  @ViewChild(IonContent) myContent: IonContent;

  senderId: string = '';
  chats = [];
  roomId: string = '';
  newMessage: string = '';

  @Input() id: string;
  @Input() name: String;

  constructor(
    public general: GeneralService,
    public http: HttpService,
    private socket: Socket
  ) {

    this.getMessages().subscribe((message: any) => {
      this.chats.push(message);
      setTimeout(() => {
        this.myContent.scrollToBottom(100);
      }, 100)
    });
  }

  ngOnInit() {
    this.senderId = GlobaldataService.userObject.user_id;
    this.getAllMessages(this.id);
  }

  getAllMessages(id) {
    this.http.post('GetRoomId', { follower_user_id: id }, true).subscribe((res: any) => {
      this.general.stopLoading();
      if(res.status == true){
        this.chats = res.data.messages;
        this.roomId = res.data.room_id;
      }
    })
  }

  sendMessage(msg: string) {
    if (this.newMessage.trim() == '') {
      return
    }
    this.socket.emit("message", { message: msg, senderId: GlobaldataService.userObject.user_id, roomId: this.roomId });
    this.newMessage = '';
    setTimeout(() => {
      this.myContent.scrollToBottom(100);
    }, 100)
  }

  getMessages() {
    let observable = new Observable(observer => {
      this.socket.on('message', (data) => {
        observer.next(data);
      });
    })
    return observable;
  }
}
