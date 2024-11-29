import { OnModuleInit } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { v4 as UUIDv4 } from 'uuid';
import IRoomParams from '../interfaces/IRoomParams';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
export class EventsGateway implements OnModuleInit {
  @WebSocketServer()
  server: Server;

  private rooms: Record<string, string[]> = {};

  onModuleInit() {
    this.server.on('connection', (socket: Socket) => {
      console.log('New user connected');

      socket.on('create-room', this.createRoom.bind(this, socket));
      socket.on('joined-room', this.joinedRoom.bind(this, socket));

      socket.on('disconnect', () => {
        console.log('User  disconnected');
      });
    });
  }

  private createRoom(socket: Socket) {
    const roomId = UUIDv4();
    socket.join(roomId);
    this.rooms[roomId] = [];
    socket.emit('room-created', { roomId });
    console.log('Room created with id', roomId);
  }

  private joinedRoom(socket: Socket, { roomId, peerId }: IRoomParams) {
    console.log('joined room called', this.rooms, roomId, peerId);
    if (this.rooms[roomId]) {
      console.log('New user has joined room', roomId, 'with peer id as', peerId);
      this.rooms[roomId].push(peerId);
      console.log('added peer to room', this.rooms);
      socket.join(roomId);
      socket.emit('get-users', {
        roomId,
        participants: this.rooms[roomId],
      });
    }
  }
}