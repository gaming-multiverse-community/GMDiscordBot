const taskQueue = [];
let isProcessingQueue = false;

function addToQueue(task) {
    taskQueue.push(task);
    processQueue();
}

function processQueue() {
    if (isProcessingQueue || taskQueue.length === 0) return;

    isProcessingQueue = true;
    const task = taskQueue.shift();

    task()
        .then(() => {
            isProcessingQueue = false;
            processQueue();
        })
        .catch((err) => {
            console.error('Error processing task:', err);
            isProcessingQueue = false;
            processQueue();
        });
}

module.exports = {
    addToQueue
};
