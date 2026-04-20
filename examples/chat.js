import MessagingServiceFactory from "messagingservicejs";

const MessagingService = await MessagingServiceFactory.InitializeAsync(
	"_|WARNING:-DO-NOT-SHARE-THIS.--Sharing-this-will-allow-someone-to-log-in-as-you-and-to-steal-your-ROBUX-and-items.|...", // .ROBLOSECURITY
	69_420_1337_80085 // Universe ID
);

MessagingService.SubscribeAsync("chat", (message) => {
	console.log("Received:", message.Data);
});

MessagingService.PublishAsync("chat", "Hello!");
