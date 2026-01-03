require("dotenv").config();
const fs = require("fs");

const BrainReq = require("../models/BrainReq");
const File = require('../models/file');
const Memory = require('../models/memory');

const { processFrontal } = require("../lobes/frontalLobe");
const { processTemporal } = require("../lobes/temporalLobe");
const { processParietal } = require("../lobes/parietalLobe");
const { processOccipital } = require("../lobes/occipitalLobe");

const { findRelevantMemory } = require('../services/memory.service');
const { decideFinalLobe } = require("../services/brainRouter.service");
const { notifyUser } = require("../services/socket.service");

async function runLobeProcessor(task) {

    let result;
    let fileContent = null;
    let file = null;

    const past = await findRelevantMemory(
        task.userId,
        task.query
    );

    console.log(`=== FOUND ${past.length} RELEVANT MEMORIES FOR CONTEXT ===`);
    const contextBlock = past.map(m => m.content).join("\n---\n");

    if(task.fileId) {
        file = await File.findById(task.fileId);
        
        if(file && file.storage === "local" && file.path && !file.mimeType.startsWith("image/")) {
            try {
                fileContent = fs.readFileSync(file.path, "utf-8");
            } catch (readErr) {
                console.warn("Could not read local file text:", readErr.message);
            }
        }
    }
    
    const routing = await decideFinalLobe({
        query: task.query,
        fileMime: file?.mimeType,
        userSettings: task.userSettings,
        memory: contextBlock,
        user: {
            id: task.userId,
        }
    });

    console.log(`>>> ROUTER SELECTED: ${routing.lobe} (${routing.reason})`);

    switch(routing.lobe) {
        case "frontal":
            result = await processFrontal({
                query: task.query,
                user: { id: task.userId },
                memory: contextBlock
            });
            break;
        
        case "temporal":
            result = await processTemporal({
                query: task.query,
                fileContent,
                user: { id: task.userId },
                memory: contextBlock
            });
            break;
        
        case "parietal":
            result = await processParietal({
                query: task.query,
                user: { id: task.userId },
                memories: past
            });
            break;

        case "occipital":
            result = await processOccipital({
                query: task.query,
                fileId: task.fileId,
                user: { id: task.userId },
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
    if (!output) return;
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
        { status: "pending" },
        { status: "processing" },
        { new: true }
    );

    if(!task){
        console.log("=== NO PENDING BRAIN PROCESSING TASKS ===");
        return;
    }

    console.log(`\n=== PROCESSING BRAIN REQUEST ID: ${task._id} === `);

    try {
        const output = await runLobeProcessor(task);

        task.output = output;
        task.status = 'done';
        await task.save();
        await saveMemory(task, output);

        notifyUser(task.userId, "brain_result", {
            requestId: task._id,
            status: "done",
            output: output
        });

        console.log(`=== COMPLETED BRAIN REQUEST ID: ${task._id} === `);

    } catch(err){
        task.status = 'error';
        task.error = err.message;
        await task.save();
        console.error(`=== PROCESSING FAILED [${task._id}] ===`, err.message);

        notifyUser(task.userId, "brain_error", {
            requestId: task._id,
            status: "error",
            error: err.message
        });
        
    }
}

setInterval(workerLoop, 3000).unref();

module.exports = {
    startBrainWorker: workerLoop
};