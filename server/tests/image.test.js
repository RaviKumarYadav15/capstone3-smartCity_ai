import test from 'node:test';
import assert from 'node:assert/strict';
import { detectImageType } from '../src/utils/image.js';

const pad = (b) => Buffer.concat([Buffer.from(b), Buffer.alloc(16)]);

test('detects jpeg / png / webp by magic bytes', () => {
  assert.equal(detectImageType(pad([0xff, 0xd8, 0xff, 0xe0])).ext, 'jpg');
  assert.equal(detectImageType(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])).ext, 'png');
  const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(8)]);
  assert.equal(detectImageType(webp).ext, 'webp');
});

test('rejects html/svg/script disguised as an image', () => {
  assert.equal(detectImageType(Buffer.from('<svg onload=alert(1)> padding padding')), null);
  assert.equal(detectImageType(Buffer.from('GIF89a padding padding padding')), null);
  assert.equal(detectImageType(Buffer.alloc(3)), null);
});
