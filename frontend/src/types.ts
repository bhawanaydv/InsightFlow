export type User = { id: string; name: string; email: string; createdAt: string };
export type Dataset = {
  id: string; projectId: string; originalFilename: string; mimeType: string; sizeBytes: number;
  rowCount: number; columnCount: number; columns: string[]; detectedTypes: Record<string, string>; createdAt: string;
};
export type ProjectFields = {
  id: string; name: string; userId: string; createdAt: string; updatedAt: string;
  _count?: { datasets: number };
};
export type DatasetSummary = Pick<Dataset, 'id' | 'originalFilename' | 'rowCount' | 'columnCount' | 'createdAt'>;
export type ProjectSummary = ProjectFields & { datasets: DatasetSummary[] };
export type Project = ProjectFields & { datasets: Dataset[] };
