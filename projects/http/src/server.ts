import cors from "cors";
import express from "express";
import { createServer } from "http";

import multer from 'multer';
import multerS3 from 'multer-s3';

import { S3Client } from "@aws-sdk/client-s3";
import { MinioStorageEngine } from "@namatery/multer-minio";
import { Client } from "minio";

import mimeTypes from 'mime-types';
import * as uuid from 'uuid';
import path from "path";
import { IStorageOptions } from "@namatery/multer-minio/dist/lib/storage.options";

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json());

let storage: any;

let method: string = process.env.UPLOAD ?? 'minio';

switch (method) {
    case 'arvan':
        const s3 = new S3Client({
            region: 'default',
            endpoint: 'https://s3.ir-thr-at1.arvanstorage.ir',
            credentials: {
                accessKeyId: '8eee4aac-a5a8-46c3-8353-3e74a4332a44',
                secretAccessKey: '85c32d5377bf23bcff7c373b3bca7ffcecff14652bfa8ba0138fdc52372b50de',
            },
        });

        const bucket = 'chat-media';

        storage = multerS3({
            s3: s3,
            bucket: bucket,
            acl: 'public-read',
            metadata: (_, file, cb) => {
                cb(null, { fieldName: file.fieldname });
            },
            key: (_, file, cb) => {
                const ext = mimeTypes.extension(file.mimetype);
                const filename = `${uuid.v4()}.${ext}`;

                cb(null, filename);
            },
        });
        break;

    case 'minio':
        const minioClient = new Client({
            port: 443,
            endPoint: "s3.tv-92.com",
            accessKey: "UKLODowg867OkaPh9f2r",
            secretKey: "638w0h4zruqEi5oHmSVZ0PUlTa1EwBOFxxDJaSvr",
        });

        const options: IStorageOptions = {

            path: '',
            region: 'german',
            bucket: {
                init: true,
                versioning: false,
                forceDelete: false,
            },
            object: {
                name: (req, file) => {
                    const ext = mimeTypes.extension(file.mimetype);
                    const filename = `${uuid.v4()}.${ext}`;

                    (req as any).file_location = `https://s3.tv-92.com/uploads/${filename}`;

                    return filename;
                },
                useOriginalFilename: false,
            },
        };

        storage = new MinioStorageEngine(minioClient, 'uploads', options);
        break;

    case 'disk':
        storage = multer.diskStorage({
            destination: path.join(process.cwd(), 'public', 'uploads'),
            filename: (_, file, cb) => {
                const ext = mimeTypes.extension(file.mimetype);
                const filename = `${uuid.v4()}.${ext}`;

                cb(null, filename);
            },
        });

    default:
        break;
}



const upload = multer({
    storage: storage,
});


export {
    app,
    express, server, upload
};
