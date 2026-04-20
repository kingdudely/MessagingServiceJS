export default class RBXScriptConnection {
	#Callback;
	#Connected = true;
	get Connected() {
		return this.#Connected;
	}

	Fire(...args) {
		if (this.#Connected) {
			this.#Callback(...args);
		}
	}

	Disconnect() {
		this.#Connected = false;
	}

	constructor(Callback) {
		if (typeof Callback !== "function") {
			throw new TypeError("Callback must be a function");
		}

		this.#Callback = Callback;
	}
}