import { Client } from '@elastic/elasticsearch';

const client = new Client({
    node: process.env.ELASTIC_ENDPOINT,
    auth: {
        username: process.env.ELASTIC_USERNAME as string,
        password: process.env.ELASTIC_PASSWORD as string,
    }
});

export default client;