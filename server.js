const path = require('path');
const mongoose = require('mongoose');
const Msg = require('./models/message');
const Bid = require('./models/bidroom');
const mongoDB = 'mongodb+srv://BidRoom:9d5p6pZSL71mcV5g@cluster0.ms6xi.mongodb.net/test';

const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const formatMessage = require('./utils/messages');

const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers
} = require('./utils/users');

const app = express();
app.use(express.json());
const server = http.createServer(app);
const io = socketio(server);

mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true }).then(() => {
  console.log('connected')
}).catch(err => console.log(err));
// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

const botName = 'Bid-Room';
let BidRoom = [];
app.get('/maxBid', async (req, res) => {
  BidRoom = await Bid.find({})

  try {
    const bid = []
    let index = 0;
    BidRoom.forEach(async (element) => {
  
      // console.log(element)
      const max = await Msg.find({ "roomId": { $eq: element.Bidname } }).sort({ bidPrice: -1 }).limit(1);
      index++;
      console.log(index)
      if (max.length != 0) {
        bid.push(max[0])
      }

      if (index == BidRoom.length ) {
        res.status(200).send(bid);
      }
    });
    // const messages = await Msg.find({}).sort({ bidPrice: -1 }).limit(1);

  } catch (error) {
    res.status(500).send(error);
  }
  console.log(BidRoom);
})
// get all bidroom
app.get('/allblogs', async (req, res) => {

  try {
      const bids = await Bid.find({});
      res.status(200).send(bids);
  } catch (error) {
      res.status(500).send(error);
  }
})



//   add new bidroom 
app.post('/bid',async (req, res) => {
  console.log(req.body);
  const bid = new Bid(req.body);


  try {
      await bid.save();
      res.status(201).send(bid);
  } catch (error) {
      res.status(500).send(error);
  }
})

// Run when client connects
io.on('connection', (socket) => {
  // for store message
  Msg.find().then(result => {
    socket.emit('output-messages', result)
  })

  // room
  socket.on('joinRoom', ({ username, room }) => {
    const user = userJoin(socket.id, username, room);

    socket.join(user.room);

    // Welcome current user
    socket.emit('message', formatMessage(botName, 'Welcome to Room!'));

    // Broadcast when a user connects
    // room
    socket.broadcast
      .to(user.room)
      .emit(
        'message',
        formatMessage(botName, `${user.username} has joined the chat`)
      );

    // Send users and room info
    // room
    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room)
    });
  });

  // Listen for chatMessage
  // socket.on('chatMessage', msg => {
  //   const user = getCurrentUser(socket.id);
  //   io.to(user.room).emit('message', formatMessage(user.username, msg));
  // });




  socket.on('chatMessage', msgObj => {
    const user = getCurrentUser(socket.id);
    const message = new Msg({ username: user.username, text: msgObj.msg, roomId: msgObj.roomId, 
      bidPrice: parseInt(msgObj.msg), msgDateTime: msgObj.msgtime });
    message.save().then(() => {
      io.emit('message', message)
    })
    // console.log(Msg)
    // Msg.deleteMany({},function(res){
    //   console.log(res);
    // });
  });


  // Runs when client disconnects
  socket.on('disconnect', () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        'message',
        formatMessage(botName, `${user.username} has left the chat`)
      );

      // Send users and room info
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room)
      });
    }
  });
});


const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
