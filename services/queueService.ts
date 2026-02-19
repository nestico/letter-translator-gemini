import PQueue from 'p-queue';

// Singleton Queue Instance to manage Global Concurrency
// Limit: 1 concurrent request.
// Rate: Max 10 requests per 1 minute (60s).
export const translationQueue = new PQueue({
    concurrency: 1,
    interval: 60000,
    intervalCap: 10
});

// Event listeners for debugging
translationQueue.on('active', () => {
    console.log(`[Queue] Processing request. Pending: ${translationQueue.pending}, Waiting: ${translationQueue.size}`);
});

translationQueue.on('next', () => {
    console.log(`[Queue] Task completed. Size: ${translationQueue.size}`);
});

/**
 * Wraps a promise in the queue and returns the result.
 * Provides a way to check queue size.
 */
export const queueRequest = <T>(task: () => Promise<T>): { result: Promise<T>, position: number } => {
    const position = translationQueue.size + translationQueue.pending + 1; // 1-based index (current + waitees)
    const result = translationQueue.add(task) as Promise<T>; // Type assertion to fix 'void' inference if queue is paused
    return { result, position };
};

export const getQueueStatus = () => {
    return {
        pending: translationQueue.pending, // Running
        size: translationQueue.size, // Waiting
        isPaused: translationQueue.isPaused,
    };
};
