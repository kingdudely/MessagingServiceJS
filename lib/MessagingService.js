import { getRandomValues } from "node:crypto";
import { EventEmitter } from "node:events";
import {
	HubConnectionBuilder,
	HttpTransportType,
	LogLevel,
} from "@microsoft/signalr";
import InitializeJSONBigInt from "json-bigint";

const JSONbig = InitializeJSONBigInt({ useNativeBigInt: true });
const bigIntArray = new BigInt64Array(1);
const randomBigInt = () => getRandomValues(bigIntArray)[0];

export default class MessagingService {
	#Connection;
	#Event = new EventEmitter();

	static async InitializeAsync(robloSecurity, universeId) {
		const instance = new this();
		instance.#Connection = new HubConnectionBuilder()
			.withUrl(`https://csm.roblox.com/v1/router/?id=&universeId=${universeId}`, {
				transport: HttpTransportType.WebSockets,
				headers: {
					"X-Roblox-ChannelType": "Test",
					"Cookie": `.ROBLOSECURITY=${robloSecurity}`,
				},
				skipNegotiation: true,
			})
			.withServerTimeoutInMilliseconds(30_000)
			.withKeepAliveIntervalInMilliseconds(10_000)
			.configureLogging(LogLevel.Information)
			.withAutomaticReconnect()
			.build();

		instance.#Connection.on("Message", (topic, payload) => {
			try {
				payload = JSONbig.parse(payload);
			} catch {};

			instance.#Event.emit(topic, payload);
		});

		await instance.#Connection.start();

		return instance;
	}

	async PublishAsync(topic, message) {
		await this.#Connection.invoke("Publish", topic, JSONbig.stringify({
			"Data": message,
			"Sent": Date.now() / 1_000,
			"TraceId": randomBigInt(),
			"TracingEnabled": false,
		}), 0);
	}

	async SubscribeAsync(topic, callback) {
		this.#Event.on(topic, callback);
		await this.#Connection.invoke("Subscribe", topic, 0);
	}

	async UnsubscribeAsync(topic, callback) {
		this.#Event.off(topic, callback);

		if (this.#Event.listenerCount(topic) === 0) {
	        await this.#Connection.invoke("Unsubscribe", topic);
	    }
	}
}
