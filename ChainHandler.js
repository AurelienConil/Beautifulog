// This abstract class for Chain of Responsibility pattern



class ChainHandler {
    constructor(nextHandler = null) {
        this.nextHandler = nextHandler;
    }

    setNext(handler) {
        this.nextHandler = handler;
        return handler;
    }

    handle(data) {
        if (this.nextHandler) {
            return this.nextHandler.handle(data);
        }
        return data;
    }
}

module.exports = ChainHandler;