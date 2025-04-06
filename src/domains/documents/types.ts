export type BucketDocument = {
  id: string;
  file_path: string;
  content: string;
  contentType: string;
  binaryFile: boolean;
}