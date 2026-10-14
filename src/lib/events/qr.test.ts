import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { qrSvg } from './qr.ts';

describe('qrSvg', () => {
  it('draws the code as an svg that scales', () => {
    const svg = qrSvg('Zm9vYmFyYmF6cXV4Zm9v');
    assert.match(svg, /^<svg /);
    assert.match(svg, /viewBox="0 0 \d+ \d+"/);
    assert.match(svg, /<path /);
    // Sized by the page's CSS, not by attributes baked in here.
    assert.doesNotMatch(svg, /<svg[^>]* width="/);
  });

  it('is the same picture for the same code, and a different one for another', () => {
    assert.equal(qrSvg('abc'), qrSvg('abc'));
    assert.notEqual(qrSvg('abc'), qrSvg('abd'));
  });

  it('refuses an empty code rather than drawing a QR of nothing', () => {
    assert.throws(() => qrSvg(''), /empty/);
  });
});
