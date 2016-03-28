
var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};


/* Starting up a Socket.IO server */
exports.listen = function (server) {
    
    io = socketio.listen(server);
    io.set('log level',1);
    
    io.sockets.on('connection',function (socket) {
       guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);
       joinRoom(socket,'Lobby');
       
       handleMessageBroadcasting(socket, nickNames);
       handleNameChangeAttempts(socket,nickNames,namesUsed);
       handleRoomJoining(socket);
       
       socket.on('rooms',function () {
           socket.emit('rooms',io.sockets.manager.rooms);
       });
       handleClientDisconnection(socket,nickNames,namesUsed);
    });
    
};

/* assign a guest user name */
function assignGuestName(socket, guestNumber, nickNames, namesUsed) {
    var name = 'Guest' + guestNumber;
    nickNames[socket.id] = name;
    socket.emit('nameResult',{
        success : true,
        name    :name
    });
    namesUsed.push(name);
    return guestNumber + 1;
}

/* user join the room */
function joinRoom(socket, room) {
    socket.join(room);
    currentRoom[socket.id] = room;
    socket.emit('joinResult',{room:room});
    socket.broadcast.to(room).emit('message', { text : nickNames[socket.id] + 'has joined' + room});
    
    var usersInRoom = io.sockets.clients(room);
    
    if (usersInRoom.length > 1){
        var userInRoomSummary =  'Users currently in' + room + ': ';
        for( var index in usersInRoom){

            var userSocketId = usersInRoom[index].id;
            if (userSocketId != socket.id){
                if (index > 0) {
                    userInRoomSummary +=', ';
                }
                userInRoomSummary += nickNames[userSocketId];
                
            }
        }

        userInRoomSummary +='.';
        socket.emit('message',{text:userInRoomSummary});
    }
}

/* Logic to handle name-request attempts */
function handleNameChangeAttempts(socket, nickNames,nameUsed){
    socket.on('nameAttempt',function(name){
        if(name.indexOf('Guest')==0){
            socket.emit('nameResult',{
                success: false,
                message: 'Names cannot begin with "Guest".'
            });
        } else {
                if (namesUsed.indexOf(name) == -1) {
                    var previuosName = nickNames[socket.id];
                    var previuosNameIndex = namesUsed.indexOf(previuosName);
                    namesUsed.push(name);
                    nickNames[socket.id] = name;
                    delete namesUsed[previuosNameIndex];
                    socket.emit('nameResult',{
                    success: true,
                    name: name
                    });
                    socket.broadcast.to(currentRoom[socket.id]).emit('message',{
                        text: previuosName + ' is now known as ' + name + '.'
                    });
                } else {
                    socket.emit('nameResult',{
                        success: false,
                        message: 'That name is already in use'
                        
                    });
                   }
                  }
        });
}

/* Logic to handle message broadcasting */
function handleMessageBroadcasting(socket) {
  socket.on('message', function (message) {
    socket.broadcast.to(message.room).emit('message', {
      text: nickNames[socket.id] + ': ' + message.text
    });
  });
}

/* logic to handle room joining*/
function handleRoomJoining(socket) {
  socket.on('join', function(room) {
    socket.leave(currentRoom[socket.id]);
    joinRoom(socket, room.newRoom);
  });
}

/* Handle user disconnection */
function handleClientDisconnection(socket) {
  socket.on('disconnect', function() {
    var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
    delete namesUsed[nameIndex];
    delete nickNames[socket.id];
  });
}


