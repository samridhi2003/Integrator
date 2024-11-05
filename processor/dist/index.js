"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const fs = __importStar(require("fs"));
const TOPIC_NAME = "integrator";
const client = new client_1.PrismaClient();
// Configure Kafka client
const kafka = new kafkajs_1.Kafka({
    clientId: 'outbox-processor',
    brokers: ['kafka-262393bd-samridhisingh103b-aa99.k.aivencloud.com:15946'],
    ssl: {
        ca: [fs.readFileSync('./ca.pem', 'utf-8')],
        key: fs.readFileSync('./service.key', 'utf-8'),
        cert: fs.readFileSync('./service.cert', 'utf-8')
    },
});
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const producer = kafka.producer();
        const consumer = kafka.consumer({ groupId: 'kafka-262393bd' });
        // Connect both producer and consumer
        yield producer.connect();
        yield consumer.connect();
        console.log('Producer and Consumer connected');
        // Set up consumer
        yield consumer.subscribe({ topic: "integrator", fromBeginning: true });
        yield consumer.run({
            eachMessage: (_a) => __awaiter(this, [_a], void 0, function* ({ topic, partition, message }) {
                var _b;
                console.log({
                    topic,
                    partition,
                    offset: message.offset,
                    value: (_b = message.value) === null || _b === void 0 ? void 0 : _b.toString(),
                    timestamp: message.timestamp
                });
            }),
        });
        // Main processing loop
        while (true) {
            try {
                const pendingRows = yield client.zapRunOutbox.findMany({
                    where: {},
                    take: 10
                });
                console.log(pendingRows);
                producer.send({
                    topic: TOPIC_NAME,
                    messages: pendingRows.map(r => {
                        return {
                            value: JSON.stringify({ zapRunId: r.zapRunId, stage: 0 })
                        };
                    })
                });
                if (pendingRows.length > 0) {
                    yield producer.send({
                        topic: TOPIC_NAME,
                        messages: pendingRows.map(row => ({
                            value: JSON.stringify(row.zapRunId),
                            timestamp: Date.now().toString()
                        }))
                    });
                    yield client.zapRunOutbox.deleteMany({
                        where: {
                            id: {
                                in: pendingRows.map(x => x.id)
                            }
                        }
                    });
                    console.log(`Processed ${pendingRows.length} messages`);
                }
                // Add delay between batches
                yield new Promise(resolve => setTimeout(resolve, 1000));
            }
            catch (error) {
                console.error('Error in processing loop:', error);
                yield new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    });
}
// Handle graceful shutdown
process.on('SIGTERM', () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('Shutting down...');
    yield kafka.producer().disconnect();
    yield kafka.consumer({ groupId: 'zapier' }).disconnect();
    yield client.$disconnect();
}));
main().catch(console.error);
