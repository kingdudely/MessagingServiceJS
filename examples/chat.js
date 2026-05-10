import MessagingServiceFactory from "messagingservicejs";

const MessagingService = await MessagingServiceFactory.InitializeAsync(
	"_|WARNING:-DO-NOT-SHARE-THIS.--Sharing-this-will-allow-someone-to-log-in-as-you-and-to-steal-your-ROBUX-and-items.|...", // .ROBLOSECURITY
	69_420_1337_80085 // Universe ID
);

function onChat(message) {
	console.log("Received:", message);
}

await MessagingService.SubscribeAsync("chat", onChat);
await MessagingService.PublishAsync("chat", "Hello!");
await MessagingService.UnsubscribeAsync("chat", onChat);
