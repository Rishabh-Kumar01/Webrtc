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
        this.handleDisconnect(socket);
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
      console.log(
        'New user has joined room',
        roomId,
        'with peer id as',
        peerId,
      );
      this.rooms[roomId].push(peerId);
      console.log('added peer to room', this.rooms);

      // whenever anyone joins the room
      socket.on('ready', () => {
        // from the frontend once someone joins the room we will emit a ready event
        // then from our server we will emit an event to all the clients conn that a new peer has added
        socket.to(roomId).emit('user-joined', { peerId });
      });

      socket.join(roomId);
      socket.emit('get-users', {
        roomId,
        participants: this.rooms[roomId],
      });
    }
  }

  private handleDisconnect(socket: Socket) {
    // Find the room the user was in and remove them
    const rooms = Object.keys(this.rooms);
    for (const roomId of rooms) {
      const index = this.rooms[roomId].indexOf(socket.id);
      if (index !== -1) {
        this.rooms[roomId].splice(index, 1); // Remove the user from the room
        console.log(`User ${socket.id} removed from room ${roomId}`);
        // Optionally, emit an event to notify other users in the room
        this.server.to(roomId).emit('user-left', { peerId: socket.id, roomId });
        break;
      }
    }
  }
}
