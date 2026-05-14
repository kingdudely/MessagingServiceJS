import MessagingServiceFactory from "messagingservicejs";

const universeId = 69_420_1337_80085;
const ROBLOSECURITY = "_|WARNING:-DO-NOT-SHARE-THIS.--Sharing-this-will-allow-someone-to-log-in-as-you-and-to-steal-your-ROBUX-and-items.|...";

const MessagingService = new MessagingServiceFactory(ROBLOSECURITY, universeId);
await MessagingService.ConnectAsync();

let unsubscribeAsync
unsubscribeAsync = await MessagingService.SubscribeAsync("chat", async (message) => {
        console.log("Received message:", message.Data);
        await unsubscribeAsync(); // or await MessagingService.UnsubscribeAsync("chat", callback)
        await MessagingService.DisconnectAsync();
});

await MessagingService.PublishAsync("chat", "Yo, wassup bro?!");
