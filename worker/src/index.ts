//import { PrismaClient } from "@prisma/client";
import { Kafka, logLevel } from 'kafkajs';

const TOPIC_NAME = "zap-events";
//const client = new PrismaClient();
const kafka = new Kafka({
    clientId: 'outbox-processor',
    brokers: ['wise-shiner-9599-us1-kafka.upstash.io:9092'],
    ssl: true,
    sasl: {
        mechanism: 'scram-sha-256',
        username: 'd2lzZS1zaGluZXItOTU5OST4PnAUxb818dCeJG7oNZZrM2Bt9uAXyMprknVL9g0',
        password: 'NmRiYzY5MDItYWRlZS00ODhmLTljYWEtZTBiNzVlZjMzNjIx'
    },
    logLevel: logLevel.ERROR,
})
async function main() {
    const consumer = kafka.consumer({groupId: 'main-worker'});
    await consumer.connect();
    
    await consumer.subscribe({ topic: "zap-events", fromBeginning: true });
    await consumer.run({
        autoCommit:false,
        eachMessage: async ({ topic, partition, message }) => {
          console.log({
            partition,
            offset: message.offset,
            value: message.value?.toString(),
          });
          //stops excution for 1s
          await new Promise(r => setTimeout(r,50));
          
          console.log("processing done");

          await consumer.commitOffsets([{
            topic: TOPIC_NAME,
            partition: partition,
            offset:(parseInt(message.offset) +1).toString()
          }])
        },
      });
    
}
main();