import { createServer } from "http";
import cors from "cors";
import express from "express";

import multer from 'multer';
import multerS3 from 'multer-s3';

import { GetBucketCorsCommand, PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";

import * as uuid from 'uuid';
import mimeTypes from 'mime-types';

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text());


const s3 = new S3Client({
    region: 'default',
    endpoint: 'https://s3.ir-thr-at1.arvanstorage.ir',
    credentials: {
        accessKeyId: '8eee4aac-a5a8-46c3-8353-3e74a4332a44',
        secretAccessKey: '85c32d5377bf23bcff7c373b3bca7ffcecff14652bfa8ba0138fdc52372b50de',
    },
});

const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: 'chat-media',
        acl: 'public-read',
        metadata: (_, file, cb) => {
            cb(null, { fieldName: file.fieldname });
        },
        key: (_, file, cb) => {
            const ext = mimeTypes.extension(file.mimetype);
            const filename = `${uuid.v4()}.${ext}`;

            cb(null, filename);
        },
    }),
});


export {
    server,
    app,
    express,
    upload,
}