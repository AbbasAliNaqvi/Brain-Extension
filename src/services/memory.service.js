const Memory = require('../models/memory');

async function findRelevantMemory(
    userId,
    query
) {
    const memories = await Memory.find({
        userId,
        content: {
            $regex: query.split(" ")[0],
            $options: "i"
        }
    }).sort({
        createdAt: -1
    }).limit(5);

    return memories;
}

module.exports = {
    findRelevantMemory
};