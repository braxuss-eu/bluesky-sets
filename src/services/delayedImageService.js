class DelayedImageService {
    constructor() {
        this.queue = [];
        this.loading = false;
    }

    preloadImage(url, /** @type { AbortController } */ abortController) {
        return new Promise((resolve, reject) => {
            this.queue.push({ url, resolve, reject, abortController });
            abortController.signal.onabort = (ev) => {
                reject(ev.target.reason);
            };
            this.processQueue();
        });
    }

    async processQueue() {
        if (this.loading || this.queue.length === 0) {
            return;
        }

        this.loading = true;
        const { url, resolve, reject, abortController } = this.queue.shift();

        try {
            abortController.signal.throwIfAborted();
            await new Promise((imgResolve, imgReject) => {
                var tmp = new Image();
                var tries = 3;
                tmp.onload = () => {
                    imgResolve();
                };
                tmp.onerror = () => {
                    // console.warn("Error loading image", url);
                    if ((!abortController.signal.aborted) && --tries > 0) {                        
                        tmp.src = "#";
                        setTimeout(() => {
                            tmp.src = url;
                        }, 1000);
                        return;
                    } else {
                        // console.error("Failed to load image", url);
                        imgReject(new Error("Failed to load image"));
                    }
                };
                tmp.src = url;
            });
            resolve(url);
        } catch (error) {
            reject(error);
        } finally {
            this.loading = false;
            this.processQueue();
        }
    }
}

const delayedImageService = new DelayedImageService();
export default delayedImageService;