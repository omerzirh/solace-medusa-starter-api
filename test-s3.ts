import { S3Client, ListObjectsCommand, PutObjectCommand, ListBucketsCommand } from "@aws-sdk/client-s3";
import * as fs from "fs";
import * as path from "path";

// Simple .env parser since dotenv might not be installed
const envPath = path.resolve(__dirname, ".env");
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf8");
    envConfig.split("\n").forEach((line) => {
        const [key, value] = line.split("=");
        if (key && value && !process.env[key.trim()]) {
            process.env[key.trim()] = value.trim();
        }
    });
}

if (process.env.S3_SECRET_ACCESS_KEY?.startsWith("sb_")) {
    console.warn("WARNING: S3_SECRET_ACCESS_KEY starts with 'sb_'. This looks like a Supabase Project API key, not an S3 Secret Key. Please generate S3 Credentials in Supabase Dashboard -> Project Settings -> Storage -> S3 Access Keys.");
}

const forcePathStyle = process.argv.includes("--forcePathStyle");

console.log(`Testing S3 Connection with forcePathStyle: ${forcePathStyle}`);
console.log(`Endpoint: ${process.env.S3_ENDPOINT}`);
console.log(`Region: ${process.env.S3_REGION}`);
console.log(`Bucket: ${process.env.S3_BUCKET}`);

const client = new S3Client({
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
    region: process.env.S3_REGION,
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: forcePathStyle,
});

async function run() {
    try {
        console.log("Attempting to list buckets...");
        const cmd = new ListBucketsCommand({});
        const response = await client.send(cmd);
        console.log("Success: Connection established.");
        console.log("Buckets:", response.Buckets?.map(b => b.Name).join(", "));
    } catch (err) {
        console.error("Error occurred:", err);
    }
}

run();
