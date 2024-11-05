import { PrismaClient } from "@prisma/client";
import { Kafka } from 'kafkajs';
import * as fs from 'fs';

const TOPIC_NAME = "integrator";
const client = new PrismaClient();

// Configure Kafka client
const kafka = new Kafka({
    clientId: 'outbox-processor',
    brokers: [process.env.KAFKA_URL!],
    ssl: {
        ca: [fs.readFileSync('./ca.pem', 'utf-8')],
        key: fs.readFileSync('./service.key', 'utf-8'),
        cert: fs.readFileSync('./service.cert', 'utf-8')
    },
});

async function main() {
    const producer = kafka.producer();
    const consumer = kafka.consumer({ groupId: 'kafka-262393bd' });

    // Connect both producer and consumer
    await producer.connect();
    await consumer.connect();
    console.log('Producer and Consumer connected');

    // Set up consumer
    await consumer.subscribe({ topic: "integrator", fromBeginning: true });
    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            console.log({
                topic,
                partition,
                offset: message.offset,
                value: message.value?.toString(),
                timestamp: message.timestamp
            });
        },
    });

    // Main processing loop
    while (true) {
        try {
            const pendingRows = await client.zapRunOutbox.findMany({
                where: {},
                take: 10
            });
            console.log(pendingRows);

            producer.send({
                topic: TOPIC_NAME,
                messages: pendingRows.map( r => {
                    return{
                        value:JSON.stringify({zapRunId : r.zapRunId, stage: 0})
                    }
                })
            })

            if (pendingRows.length > 0) {
                await producer.send({
                    topic: TOPIC_NAME,
                    messages: pendingRows.map(row => ({
                        value: JSON.stringify(row.zapRunId),
                        timestamp: Date.now().toString()
                    }))
                });

                await client.zapRunOutbox.deleteMany({
                    where: {
                        id: {
                            in: pendingRows.map(x => x.id)
                        }
                    }
                });

                console.log(`Processed ${pendingRows.length} messages`);
            }

            // Add delay between batches
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error('Error in processing loop:', error);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    console.log('Shutting down...');
    await kafka.producer().disconnect();
    await kafka.consumer({ groupId: 'zapier' }).disconnect();
    await client.$disconnect();
});

main().catch(console.error);