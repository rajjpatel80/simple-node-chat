const path = require("path");
const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const cors = require("cors");
const dotenv = require("dotenv");
const {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom,
} = require("./models/user");
const {
  generateMessage,
  generateLocationMessage,
} = require("./models/message");
const Filter = require("bad-words");

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT || 3001;

// app.use(cors)
// app.use(express.json());

io.on("connection", (socket) => {
  console.log("new web socket connection");

  socket.on("join", (options, callback) => {
    const { error, user } = addUser({ id: socket.id, ...options });
    if (error) {
      return error;
    } else {
      socket.join(user.room);
      socket.emit("message", generateMessage("Admin", `welcome`));
      socket.broadcast
        .to(user.room)
        .emit(
          "message",
          generateMessage("Admin", `${user.username} has joined`)
        );
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });

  socket.on("sendMessage", (message, callback) => {
    const user = getUser(socket.id);
    const filter = new Filter();

    if (filter.isProfane(message)) {
      return callback("Profanity is not allowed");
    } else {
      io.to(user.room).emit("message", generateMessage(user.username, message));
    }
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);

    if (user) {
      io.to(user.room).emit(
        "message",
        generateMessage("Admin", `${user.user} has left`)
      );
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });
});

server.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
