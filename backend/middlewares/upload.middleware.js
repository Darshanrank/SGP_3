import { S3Client } from "@aws-sdk/client-s3";
import multer from "multer";
import multerS3 from "multer-s3";
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

const hasS3Config = Boolean(
    process.env.AWS_REGION &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_BUCKET_NAME
);

const s3 = hasS3Config
    ? new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
    })
    : null;

const fileFilter = (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|mp4|mov/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error("Error: Images and Videos Only!"));
    }
};

const localStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const folder = file.fieldname === 'avatar' ? 'avatars' : 'skills';
        const destinationPath = path.join('uploads', folder);
        fs.mkdirSync(destinationPath, { recursive: true });
        cb(null, destinationPath);
    },
    filename: function (req, file, cb) {
        cb(null, `${uuidv4()}-${file.originalname}`);
    }
});

const upload = multer({
    storage: hasS3Config
        ? multerS3({
            s3: s3,
            bucket: process.env.AWS_BUCKET_NAME,
            metadata: function (req, file, cb) {
                cb(null, { fieldName: file.fieldname });
            },
            key: function (req, file, cb) {
                const folder = file.fieldname === 'avatar' ? 'avatars' : 'skills';
                cb(null, `${folder}/${uuidv4()}-${file.originalname}`);
            },
        })
        : localStorage,
    fileFilter: fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit (adjust for videos)
});

export const uploadMiddleware = upload;
