import qrcode from 'qrcode-generator';

/** The ticket's QR as inline SVG, drawn on the server. It encodes the ticket code and
 *  nothing else; what a scanner does with it is check-in's business (part 3), and since
 *  the page draws it fresh on every view, that can change without reissuing a ticket. */
export function qrSvg(text: string): string {
  if (!text) throw new Error('Cannot draw a QR code for an empty ticket code.');
  // Type 0 picks the smallest size that fits; M survives a cracked phone screen.
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  return qr.createSvgTag({ cellSize: 8, margin: 4, scalable: true });
}
