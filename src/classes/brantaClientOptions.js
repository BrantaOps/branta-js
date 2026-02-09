class BrantaClientOptions {
    baseUrl = null;
    defaultApiKey = null;
    
    constructor(options = {}) {
        Object.assign(this, options);
    }
}

export default BrantaClientOptions;
