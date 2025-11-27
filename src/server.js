const app = require("./app");
const connectDB = require("./config/db");
const {
  startBrainWorker
} = require("./worker/brainWorker");

async function startApp() {

await connectDB();

startBrainWorker();

const PORT = process.env.PORT || 5050;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

}

startApp();