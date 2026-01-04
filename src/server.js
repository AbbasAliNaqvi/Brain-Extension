require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");

const app = require("./app");
const connectDB = require("./config/db");

const { startBrainWorker } = require("./worker/brainWorker");
const { startDreaming } = require("./worker/dreamWorker");

const socketService = require("./services/socket.service");

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

socketService.init(io);

async function startApp() {

  await connectDB();

  startBrainWorker();
  startDreaming();

  const PORT = process.env.PORT || 5050;

  server.listen(PORT, () => {
    console.log("=====Server running on port=====", PORT);
    console.log("=====Socket.io is ready for connections=====");
  });
}

startApp();