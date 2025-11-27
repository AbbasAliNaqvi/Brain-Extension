require("dotenv").config();

const BrainReq = require("../models/BrainReq");
const File = require('../models/file');

const { processFrontal } = require("../lobes/frontalLobe.service");
const { processTemporal } = require("../lobes/temporalLobe");

async function runLobeProcessor(task) {

    let result;
    let fileContent = null;

    if(task.fileId) {
        const file = await File.findById(task.fileId);
        
        if(file && file.storage == "local") {
            fileContent = require("fs").readFileSync(file.path, "utf-8");
        }
    }
    
    switch(task.selectedLobe) {
        case "frontal":
            result = await processFrontal({
                query: task.query,
                user: task.user,
            });
            break;
        
        case "temporal":
            result = await processTemporal({
                query: task.query,
                fileContent,
                user: task.userId,
            });
            break;
        
        default:
            result = {
                lobe: "unknown",
                result: "NO IMPLEMENTATION FOR THIS LOBE"
            };
    }
    return result.result;
}

async function workerLoop(){
    console.log("\n=== BRAIN WORKER STARTED ===");

    const task = await BrainReq.findOneAndUpdate(
    {
        status: "pending"
    },
    {
        status: "processing"
    },
    {
        new: true
    }
    );

    if(!task){
        console.log("=== NO PENDING BRAIN PROCCESSING TASKS ===");
        return;
    }

    console.log(`\n=== PROCESSING BRAIN REQUEST ID: ${task._id} === `);

    try {
        const output = await runLobeProcessor(task);

        task.output =output;
        task.status = 'done';

        await task.save();

        console.log(`=== COMPLETED BRAIN REQUEST ID: ${task._id} === `);

    } catch(err){
        
        task.status = 'error';
        task.error = err.message;

        await task.save();

        console.log("PROCESSING FAILED", err.message);
    }
}

setInterval(workerLoop, 33000).unref();

module.exports = {
    startBrainWorker: workerLoop
}