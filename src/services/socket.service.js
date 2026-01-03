let io;

exports.init = (socketIoInstance) => {
    io = socketIoInstance;
    io.on("connection", (socket) => {
        console.log("=====Socket Connected:=====", socket.id);

        socket.on("join", (userId) => {
            if (userId) {
                socket.join(userId.toString());
                console.log(`=====User joined room: ${userId}=====`);
            }
        });

        socket.on("disconnect", () => {
            console.log("X=====Socket Disconnected:=====X", socket.id);
        });
    });
};

exports.notifyUser = (userId, event, data) => {
    if (io && userId) {
        io.to(userId.toString()).emit(event, data);
        console.log(`=====Emitted====='${event}'=====to=====${userId}`);
    }
};