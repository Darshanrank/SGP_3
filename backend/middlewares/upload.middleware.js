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

const chatAttachmentFilter = (_req, file, cb) => {
    const allowedMime = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'text/plain',
        'text/markdown',
        'application/json',
        'text/x-python',
        'application/javascript',
        'text/javascript',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/x-java-source',
        'text/x-c',
        'text/x-c++src'
    ];

    const allowedExt = [
        '.jpg', '.jpeg', '.png', '.gif', '.webp',
        '.pdf', '.txt', '.md', '.json', '.js', '.jsx', '.ts', '.tsx', '.py',
        '.java', '.c', '.cpp', '.h', '.hpp', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'
    ];

    const ext = path.extname(file.originalname || '').toLowerCase();
    if (allowedMime.includes(file.mimetype) || allowedExt.includes(ext)) {
        return cb(null, true);
    }

    return cb(new Error('Unsupported attachment type'));
};

const classroomFileFilter = (_req, file, cb) => {
    const allowedMime = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'text/plain',
        'text/markdown',
        'application/json',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/x-java-source',
        'text/x-c',
        'text/x-c++src',
        'text/x-python',
        'application/javascript',
        'text/javascript'
    ];

    const allowedExt = [
        '.jpg', '.jpeg', '.png', '.gif', '.webp',
        '.pdf', '.txt', '.md', '.json', '.js', '.jsx', '.ts', '.tsx', '.py',
        '.java', '.c', '.cpp', '.h', '.hpp', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'
    ];

    const ext = path.extname(file.originalname || '').toLowerCase();
    if (allowedMime.includes(file.mimetype) || allowedExt.includes(ext)) {
        return cb(null, true);
    }

    return cb(new Error('Unsupported classroom file type'));
};

const localStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const folder = file.fieldname === 'avatar' ? 'avatars' : file.fieldname === 'attachment' ? 'chat' : 'skills';
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
                const folder = file.fieldname === 'avatar' ? 'avatars' : file.fieldname === 'attachment' ? 'chat' : 'skills';
                cb(null, `${folder}/${uuidv4()}-${file.originalname}`);
            },
        })
        : localStorage,
    fileFilter: fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit (adjust for videos)
});

export const uploadMiddleware = upload;

export const uploadChatAttachmentMiddleware = multer({
    storage: hasS3Config
        ? multerS3({
            s3,
            bucket: process.env.AWS_BUCKET_NAME,
            metadata: function (_req, file, cb) {
                cb(null, { fieldName: file.fieldname });
            },
            key: function (_req, file, cb) {
                cb(null, `chat/${uuidv4()}-${file.originalname}`);
            },
        })
        : multer.diskStorage({
            destination: function (_req, _file, cb) {
                const destinationPath = path.join('uploads', 'chat');
                fs.mkdirSync(destinationPath, { recursive: true });
                cb(null, destinationPath);
            },
            filename: function (_req, file, cb) {
                cb(null, `${uuidv4()}-${file.originalname}`);
            }
        }),
    fileFilter: chatAttachmentFilter,
    limits: { fileSize: 25 * 1024 * 1024 },
});

export const uploadClassroomFileMiddleware = multer({
    storage: hasS3Config
        ? multerS3({
            s3,
            bucket: process.env.AWS_BUCKET_NAME,
            metadata: function (_req, file, cb) {
                cb(null, { fieldName: file.fieldname });
            },
            key: function (_req, file, cb) {
                cb(null, `classroom-files/${uuidv4()}-${file.originalname}`);
            },
        })
        : multer.diskStorage({
            destination: function (_req, _file, cb) {
                const destinationPath = path.join('uploads', 'classroom-files');
                fs.mkdirSync(destinationPath, { recursive: true });
                cb(null, destinationPath);
            },
            filename: function (_req, file, cb) {
                cb(null, `${uuidv4()}-${file.originalname}`);
            }
        }),
    fileFilter: classroomFileFilter,
    limits: { fileSize: 25 * 1024 * 1024 },
});
