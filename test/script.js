import * as branta from "branta";

const client = new branta.V2BrantaClient(
  new branta.BrantaClientOptions({
    baseUrl: branta.BrantaBaseServerUrl.Localhost,
    defaultApiKey:
      "<api-key-here>",
  }),
);

var payments = await client.getPayments(
  "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
);
console.log(payments);

if (payments.length == 0) {
  console.log("Creating Payment...");
  await client.addPayment({
    description: "Testing description",
    destinations: [
      {
        value: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
        zk: false,
      },
    ],
    ttl: "600",
  });
}
