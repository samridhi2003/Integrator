import { PrismaClient } from "@prisma/client";
import { Kafka, logLevel } from 'kafkajs';

const TOPIC_NAME = "zap-events";
const client = new PrismaClient();
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
    const producer = kafka.producer();
    await producer.connect();
    const consumer= kafka.consumer({groupId: "zapier"});
    const consume = async () => {
        await consumer.connect();
        await consumer.subscribe({ topic: "zap-events", fromBeginning: true });
      
        await consumer.run({
          eachMessage: async ({ topic, partition, message }) => {
            console.log({
              topic: topic,
              partition: partition,
              message: JSON.stringify(message),
            });
          },
        });
      };

    while (1) {
        const pendingRows = await client.zapRunOutbox.findMany({
            where: {},
            take: 10
        })
        
        producer.send({
            topic: TOPIC_NAME,
            messages: pendingRows.map(r=>({
                    value: r.zapRunId
                }))
        })
        await client.zapRunOutbox.deleteMany({
            where:{
                id:{ 
                    in: pendingRows.map(x=>x.id)
                }
            }
        })
    }
}

main();