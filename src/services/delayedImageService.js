class DelayedImageService {
    constructor() {
        this.queue = [];
        this.loading = false;
    }

    preloadImage(url) {
        return new Promise((resolve, reject) => {
            this.queue.push({ url, resolve, reject });
            this.processQueue();
        });
    }

    async processQueue() {
        if (this.loading || this.queue.length === 0) {
            return;
        }

        this.loading = true;
        const { url, resolve, reject } = this.queue.shift();

        try {
            await new Promise((imgResolve, imgReject) => {
                var tmp = new Image();
                var tries = 3;
                tmp.onload = () => {
                    imgResolve();
                };
                tmp.onerror = () => {
                    console.warn("Error loading image", url);
                    if (--tries > 0) {
                        tmp.src = "#";
                        setTimeout(() => {
                            tmp.src = url;
                        }, 1000);
                        return;
                    } else {
                        console.error("Failed to load image", url);
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