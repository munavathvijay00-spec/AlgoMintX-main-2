import { EventEmitter } from "events";

const eventBus = new EventEmitter();

// Optional: Increase listener limit if needed
eventBus.setMaxListeners(20);

export default eventBus;
