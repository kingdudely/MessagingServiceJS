import { EventEmitter } from "node:events";
import {
	HubConnectionBuilder,
	HttpTransportType,
	LogLevel,
} from "@microsoft/signalr";

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
			.withServerTimeoutInMilliseconds(30000)
			.withKeepAliveIntervalInMilliseconds(10000)
			.configureLogging(LogLevel.Information)
			.withAutomaticReconnect()
			.build();

		instance.#Connection.on("Message", (topic, payload) => {
			let data;
			try {
				data = JSON.parse(payload);
			} catch {
				return;
			}

			this.#Event.emit(topic, data);
		});

		await instance.#Connection.start();

		return instance;
	}

	async PublishAsync(topic, message) {
		await this.#Connection.invoke("Publish", topic, JSON.stringify(message), 0);
	}

	async SubscribeAsync(topic, callback) {
		this.#Event.on(topic, callback);
		await this.#Connection.invoke("Subscribe", topic, 0);
		return connection;
	}

	async UnsubscribeAsync(topic, callback) {
		this.#Event.off(topic, callback);
		await this.#Connection.invoke("Unsubscribe", topic);
	}
}
