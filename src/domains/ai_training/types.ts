export interface ImportTrainingData {
  Doc_type: string;
  content: string[];
  annotations: ImportAnnotation[];
}

interface ImportAnnotation {
  "Import Document Number": string | null;
  Item: ImportItem[];
}

interface ImportItem {
  object_id: number | null;
  "Part Number": string | null;
  "Import Price": string | null;
  "Quantity Ordered": string | null;
}

export interface POTrainingData {
  Doc_type: string;
  content: string[];
  annotations: POAnnotation[];
}

interface POAnnotation {
  "Purchase Order Number": string | null;
  "End User Customer Name": string | null;
  "Work Scope": string | null;
  "ARC Requirement": string | null;
  "TSN Number": string | null;
  "CSN Number": string | null;
  Item: POItem[];
}

interface POItem {
  object_id: string | null;
  "Part Number": string | null;
  "Engine Model": string | null;
  "Engine Number": string | null;
  "Serial Number": string | null;
  "Quantity Ordered": string | null;
}

export interface AiTrainingStatus {
  start_time: Date;
  current_step: number;
  dataset_name: string;
  is_training: boolean;
  progress: number;
  status_message: string;
  task_id: string;
  total_steps: number;
  training_duration: number;
  training_duration_so_far: number;
}