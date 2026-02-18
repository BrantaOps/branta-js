class BrantaClientOptions {
    baseUrl = null;
    defaultApiKey = null;
    hmacSecret = null;
    
    constructor(options = {}) {
        Object.assign(this, options);
    }
}

export default BrantaClientOptions;
