require("dotenv").config();

const BrainReq = require("../models/BrainReq");
const File = require('../models/file');
const Memory = require('../models/memory');

const { processFrontal } = require("../lobes/frontalLobe.service");
const { processTemporal } = require("../lobes/temporalLobe");

const { findRelevantMemory } = require('../services/memory.service');
const { decideFinalLobe } = require("../services/brainRouter.service");

async function runLobeProcessor(task) {

    let result;
    let fileContent = null;

    const past = await findRelevantMemory(
        task.userId,
        task.query
    );

    console.log(`=== FOUND ${past.length} RELEVANT MEMORIES FOR CONTEXT ===`);

    const contextBlock = past.map(m => m.content).join("\n---\n");

    if(task.fileId) {
        const file = await File.findById(task.fileId);
        
        if(file && file.storage == "local") {
            fileContent = require("fs").readFileSync(file.path, "utf-8");
        }
    }
    
    const routing = await decideFinalLobe({
        query: task.query,
        fileMime: task.fileMime,
        userSettings: task.userSettings,
        memory: contextBlock,
        user: {
            id: task.userId,
        }
    });

    switch(routing.lobe) {
        case "frontal":
            result = await processFrontal({
                query: task.query,
                user: {
                    id: task.userId,
                },
                memory: contextBlock
            });
            break;
        
        case "temporal":
            result = await processTemporal({
                query: task.query,
                fileContent,
                user: {
                    id: task.userId,
                },
                memory: contextBlock
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

async function saveMemory(task, output) {
    await Memory.create({
        userId: task.userId,
        BrainReqId: task._id,
        content: output,
        types: "answer",
        context: task.query
    });
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

        await saveMemory(task, output);

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