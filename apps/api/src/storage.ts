import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** Local files for development, or an S3-compatible bucket when S3_BUCKET is configured. */
export class FileStorage {
  private readonly bucket = process.env.S3_BUCKET;
  private readonly client = this.bucket ? new S3Client({
    region: process.env.S3_REGION ?? "ap-northeast-2",
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: Boolean(process.env.S3_ENDPOINT),
  }) : undefined;
  constructor(private readonly directory: string) {}
  async put(name: string, body: Uint8Array, contentType: string) {
    if (!this.client || !this.bucket) {
      mkdirSync(this.directory, { recursive: true }); writeFileSync(join(this.directory, name), body);
      return { url: `/uploads/${encodeURIComponent(name)}` };
    }
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: name, Body: body, ContentType: contentType }));
    const base = process.env.S3_PUBLIC_BASE_URL?.replace(/\/$/, "") ?? `https://${this.bucket}.s3.${process.env.S3_REGION ?? "ap-northeast-2"}.amazonaws.com`;
    return { url: `${base}/${name.split("/").map(encodeURIComponent).join("/")}` };
  }
  async read(name: string) {
    if (!this.client || !this.bucket) {
      const path = join(this.directory, name); if (!existsSync(path)) throw new Error("FILE_NOT_FOUND"); return readFileSync(path);
    }
    try {
      const object = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: name }));
      if (!object.Body) throw new Error("FILE_NOT_FOUND");
      return Buffer.from(await object.Body.transformToByteArray());
    } catch (error) { if (error instanceof Error && error.name === "NoSuchKey") throw new Error("FILE_NOT_FOUND"); throw error; }
  }
}
