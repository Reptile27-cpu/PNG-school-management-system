import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { ValidationError } from './errors';

const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const supportedTypes: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

const getStorage = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'school-logos';
  if (!url || !key) throw new Error('Supabase Storage is not configured');
  return { client: createClient(url, key, { auth: { persistSession: false } }), bucket };
};

export const uploadSchoolLogo = async (schoolId: string, logoData: string) => {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(logoData);
  if (!match) throw new ValidationError('Logo must be a PNG, JPEG, or WebP data URL');
  const contentType = match[1];
  const extension = supportedTypes[contentType];
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > MAX_LOGO_BYTES) throw new ValidationError('Logo must be smaller than 5 MB');
  const validSignature = contentType === 'image/png'
    ? buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : contentType === 'image/jpeg'
      ? buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
      : buffer.subarray(0, 4).equals(Buffer.from([82, 73, 70, 70])) && buffer.subarray(8, 12).equals(Buffer.from([87, 69, 66, 80]));
  if (!validSignature) throw new ValidationError('Logo content does not match its declared image type');
  const { client, bucket } = getStorage();
  const path = `schools/${schoolId}/logo/${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage.from(bucket).upload(path, buffer, { contentType, upsert: false, cacheControl: '3600' });
  if (error) throw new Error('Logo upload failed');
  const { data } = client.storage.from(bucket).getPublicUrl(path);
  return { path, url: data.publicUrl };
};

export const removeSchoolLogo = async (path: string | null | undefined) => {
  if (!path) return;
  const { client, bucket } = getStorage();
  const { error } = await client.storage.from(bucket).remove([path]);
  if (error) throw new Error('Logo removal failed');
};
