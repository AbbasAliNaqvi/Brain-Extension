let io;
const extensionClients = new Map();
const taskQueue = new Map();       

exports.init = (socketIoInstance) => {
    io = socketIoInstance;
    io.on("connection", (socket) => {
        socket.on("join", (userId) => {
            if (userId) {
                socket.join(userId.toString());
            }
        });

        socket.on("register_extension", (userId) => {
            if (!userId) return;
            const uid = userId.toString();
            socket.join(uid);

            extensionClients.set(uid, socket.id);
            console.log(`[Agent] Extension Linked for User: ${uid}`);

            const pendingTasks = taskQueue.get(uid) || [];
            if (pendingTasks.length > 0) {
                console.log(`[Agent] Flushing ${pendingTasks.length} tasks for ${uid}`);
                socket.emit("FLUSH_QUEUED_TASKS", { tasks: pendingTasks });
                taskQueue.delete(uid);
                
                exports.notifyUser(uid, "MOBILE_EXECUTION_UPDATE", { 
                    status: "running", 
                    message: "Desktop woke up. Processing queue." 
                });
            }
        });

        socket.on("MOBILE_DISPATCH_TASK", ({ userId, goal, actions }) => {
            if (!userId) return;
            const uid = userId.toString();
            const extSocketId = extensionClients.get(uid);
            const taskPayload = { goal, actions, id: Date.now() };

            if (extSocketId && io.sockets.sockets.get(extSocketId)) {
                io.to(extSocketId).emit("EXECUTE_REMOTE_TASK", taskPayload);
                exports.notifyUser(uid, "MOBILE_EXECUTION_UPDATE", { 
                    status: "running", 
                    message: "Task pushed to desktop." 
                });
            } else {
                const queue = taskQueue.get(uid) || [];
                queue.push(taskPayload);
                taskQueue.set(uid, queue);
                exports.notifyUser(uid, "MOBILE_EXECUTION_UPDATE", { 
                    status: "queued", 
                    message: "Desktop offline. Task queued." 
                });
            }
        });

        socket.on("MOBILE_STOP_TASK", ({ userId }) => {
            if (!userId) return;
            const uid = userId.toString();
            const extSocketId = extensionClients.get(uid);
            if (extSocketId && io.sockets.sockets.get(extSocketId)) {
                io.to(extSocketId).emit("STOP_REMOTE_TASK");
            }
            taskQueue.delete(uid);
            exports.notifyUser(uid, "MOBILE_EXECUTION_UPDATE", { 
                status: "error", 
                message: "Agent stopped. Queue cleared." 
            });
        });

        socket.on("EXTENSION_EXECUTION_UPDATE", ({ userId, status, message }) => {
            if (userId) {
                exports.notifyUser(userId, "MOBILE_EXECUTION_UPDATE", { status, message });
            }
        });

        socket.on("disconnect", () => {
            for (const [uid, sid] of extensionClients.entries()) {
                if (sid === socket.id) {
                    extensionClients.delete(uid);
                    break;
                }
            }
        });
    });
};

exports.notifyUser = (userId, event, data) => {
    if (io && userId) {
        io.to(userId.toString()).emit(event, data);
    }
};

exports.dispatchFromRest = (userId, taskPayload) => {
    if (!io) return { success: false, message: "Socket server not initialized" };
    const uid = userId.toString();
    const extSocketId = extensionClients.get(uid); 
    if (extSocketId && io.sockets.sockets.get(extSocketId)) {
        io.to(extSocketId).emit("EXECUTE_REMOTE_TASK", taskPayload);
        return { success: true, status: "running", message: "Task pushed directly to desktop." };
    } else {
        const queue = taskQueue.get(uid) || [];
        queue.push(taskPayload);
        taskQueue.set(uid, queue);
        return { success: true, status: "queued", message: "Desktop offline. Task queued." };
    }
};

exports.stopFromRest = (userId) => {
    if (!io) return { success: false, message: "Socket server down" };
    const uid = userId.toString();
    const extSocketId = extensionClients.get(uid);
    if (extSocketId && io.sockets.sockets.get(extSocketId)) {
        io.to(extSocketId).emit("STOP_REMOTE_TASK");
    }
    taskQueue.delete(uid);
    return { success: true, message: "Kill switch activated. Extension halted and queue cleared." };
};
// //join Event = userId