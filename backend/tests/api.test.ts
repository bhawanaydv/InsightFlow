import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { zipSync, strToU8 } from 'fflate';
import { app } from '../src/app.js';
import { parseDataset, validateUpload } from '../src/services/dataset-parser.js';

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(), userCreate: vi.fn(), projectFindMany: vi.fn(), projectFindFirst: vi.fn(), projectCreate: vi.fn(),
  projectUpdateMany: vi.fn(), projectDeleteMany: vi.fn(), datasetFindFirst: vi.fn(), datasetCreate: vi.fn(),
}));
vi.mock('../src/lib/prisma.js', () => ({ prisma: {
  user: { findUnique: mocks.userFindUnique, create: mocks.userCreate },
  project: { findMany: mocks.projectFindMany, findFirst: mocks.projectFindFirst, create: mocks.projectCreate, updateMany: mocks.projectUpdateMany, deleteMany: mocks.projectDeleteMany },
  dataset: { findFirst: mocks.datasetFindFirst, create: mocks.datasetCreate },
} }));

process.env.JWT_SECRET = 'test-only-secret-that-is-at-least-32-characters-long';
const authHeader = (id: string) => `Bearer ${jwt.sign({ email: `${id}@example.com` }, process.env.JWT_SECRET!, { subject: id, expiresIn: '5m' })}`;

beforeEach(() => { vi.clearAllMocks(); });

describe('authentication and ownership', () => {
  it('registers a user with a hashed password and returns a session token', async () => {
    mocks.userFindUnique.mockResolvedValue(null);
    const created = { id: 'user-1', name: 'Ada Lovelace', email: 'ada@example.com', passwordHash: '', createdAt: new Date() };
    mocks.userCreate.mockImplementation(async ({ data }: { data: { passwordHash: string } }) => ({ ...created, passwordHash: data.passwordHash }));
    const response = await request(app).post('/api/auth/register').send({ name: ' Ada Lovelace ', email: 'ADA@example.com', password: 'correct-horse-1' });
    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({ name: 'Ada Lovelace', email: 'ada@example.com' });
    expect(response.body.user.passwordHash).toBeUndefined();
    const hash = mocks.userCreate.mock.calls[0]![0].data.passwordHash as string;
    expect(hash).not.toBe('correct-horse-1');
    expect(await bcrypt.compare('correct-horse-1', hash)).toBe(true);
    expect(response.body.token).toEqual(expect.any(String));
  });

  it('rejects invalid credentials without revealing whether an email exists', async () => {
    mocks.userFindUnique.mockResolvedValue(null);
    const response = await request(app).post('/api/auth/login').send({ email: 'missing@example.com', password: 'not-the-password' });
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Email or password is incorrect.');
  });

  it('scopes project lookups to the authenticated user', async () => {
    mocks.projectFindFirst.mockResolvedValue(null);
    const response = await request(app).get('/api/projects/project-owned-by-someone-else').set('Authorization', authHeader('user-a'));
    expect(response.status).toBe(404);
    expect(mocks.projectFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'project-owned-by-someone-else', userId: 'user-a' } }));
  });

  it('checks project ownership before accepting a dataset upload', async () => {
    mocks.projectFindFirst.mockResolvedValue(null);
    const response = await request(app).post('/api/projects/not-yours/datasets').set('Authorization', authHeader('user-a')).attach('file', Buffer.from('name\nAda'), 'data.csv');
    expect(response.status).toBe(404);
    expect(mocks.projectFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'not-yours', userId: 'user-a' } }));
    expect(mocks.datasetCreate).not.toHaveBeenCalled();
  });

  it('scopes dataset preview lookups to the authenticated user', async () => {
    mocks.datasetFindFirst.mockResolvedValue(null);
    const response = await request(app).get('/api/datasets/private-dataset/preview').set('Authorization', authHeader('user-a'));
    expect(response.status).toBe(404);
    expect(mocks.datasetFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'private-dataset', project: { userId: 'user-a' } } }));
  });
});

describe('dataset upload validation and metadata', () => {
  it('extracts CSV headers, row count, and basic column types', async () => {
    const parsed = await parseDataset(Buffer.from('name,age,active\nAda,36,true\nLin,29,false\n'), 'sample.csv', 'text/csv');
    expect(parsed.columns).toEqual(['name', 'age', 'active']);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.detectedTypes).toEqual({ name: 'text', age: 'number', active: 'boolean' });
  });

  it('reads the first worksheet of a valid XLSX workbook', async () => {
    const files = {
      '[Content_Types].xml': strToU8('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'),
      '_rels/.rels': strToU8('<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'),
      'xl/workbook.xml': strToU8('<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Orders" sheetId="1" r:id="rId1"/></sheets></workbook>'),
      'xl/_rels/workbook.xml.rels': strToU8('<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'),
      'xl/worksheets/sheet1.xml': strToU8('<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>item</t></is></c><c r="B1" t="inlineStr"><is><t>quantity</t></is></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>Notebook</t></is></c><c r="B2"><v>4</v></c></row></sheetData></worksheet>'),
    };
    const buffer = Buffer.from(zipSync(files));
    const parsed = await parseDataset(buffer, 'orders.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(parsed.columns).toEqual(['item', 'quantity']);
    expect(parsed.rows).toEqual([{ item: 'Notebook', quantity: 4 }]);
    expect(parsed.detectedTypes.quantity).toBe('number');
  });

  it('rejects unsupported extensions and MIME types', async () => {
    await expect(validateUpload(Buffer.from('a,b\n1,2'), 'data.exe', 'text/csv', 1024)).rejects.toMatchObject({ status: 415 });
    await expect(validateUpload(Buffer.from('a,b\n1,2'), 'data.csv', 'application/pdf', 1024)).rejects.toMatchObject({ status: 415 });
  });

  it('rejects files that exceed the configured limit', async () => {
    await expect(validateUpload(Buffer.alloc(11), 'data.csv', 'text/csv', 10)).rejects.toMatchObject({ status: 413 });
  });

  it('rejects malformed CSV input', async () => {
    await expect(parseDataset(Buffer.from('a,b\n1,2,3\n'), 'data.csv', 'text/csv')).rejects.toMatchObject({ status: 400 });
  });

  it('rejects a corrupt XLSX archive', async () => {
    await expect(parseDataset(Buffer.from('not a zip file'), 'broken.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).rejects.toMatchObject({ status: 400 });
  });
});
