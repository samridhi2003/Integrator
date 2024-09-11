"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const kafkajs_1 = require("kafkajs");
const TOPIC_NAME = "zap-events";
const client = new client_1.PrismaClient();
const kafka = new kafkajs_1.Kafka({
    clientId: 'outbox-processor',
    brokers: ['wise-shiner-9599-us1-kafka.upstash.io:9092'],
    ssl: true,
    sasl: {
        mechanism: 'scram-sha-256',
        username: 'd2lzZS1zaGluZXItOTU5OST4PnAUxb818dCeJG7oNZZrM2Bt9uAXyMprknVL9g0',
        password: 'NmRiYzY5MDItYWRlZS00ODhmLTljYWEtZTBiNzVlZjMzNjIx'
    },
    logLevel: kafkajs_1.logLevel.ERROR,
});
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const producer = kafka.producer();
        yield producer.connect();
        const consumer = kafka.consumer({ groupId: "zapier" });
        const consume = () => __awaiter(this, void 0, void 0, function* () {
            yield consumer.connect();
            yield consumer.subscribe({ topic: "zap-events", fromBeginning: true });
            yield consumer.run({
                eachMessage: (_a) => __awaiter(this, [_a], void 0, function* ({ topic, partition, message }) {
                    console.log({
                        topic: topic,
                        partition: partition,
                        message: JSON.stringify(message),
                    });
                }),
            });
        });
        while (1) {
            const pendingRows = yield client.zapRunOutbox.findMany({
                where: {},
                take: 10
            });
            producer.send({
                topic: TOPIC_NAME,
                messages: pendingRows.map(r => ({
                    value: r.zapRunId
                }))
            });
            yield client.zapRunOutbox.deleteMany({
                where: {
                    id: {
                        in: pendingRows.map(x => x.id)
                    }
                }
            });
        }
    });
}
main();
