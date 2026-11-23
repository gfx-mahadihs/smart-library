import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

// 1. Generate crisp SVG favicon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <circle cx="32" cy="32" r="30" fill="#14213D"/>
  <g transform="translate(32, 32)">
    <!-- Lime angled spine -->
    <rect x="-8.5" y="-14" width="6" height="28" rx="3" fill="#D1FF42" transform="rotate(-12 -5.5 0)"/>
    <!-- White angled spine -->
    <rect x="2.5" y="-14" width="6" height="28" rx="3" fill="#FFFFFF" transform="rotate(6 5.5 0)"/>
  </g>
</svg>
`;

fs.writeFileSync("public/favicon.svg", svgContent, "utf-8");
console.log("Wrote public/favicon.svg");

// 2. Generate 32x32 ICO file with BMP data
function generateIco32() {
  const width = 32;
  const height = 32;
  const rad1 = (12 * Math.PI) / 180;
  const rad2 = (-6 * Math.PI) / 180;

  // Pixel buffer: height rows, width columns, 4 bytes (BGRA) per pixel
  // BMP stores rows from bottom to top!
  const pixelData = Buffer.alloc(width * height * 4);

  for (let row = 0; row < height; row++) {
    // row 0 in BMP is bottom row (y = height - 1)
    const y = height - 1 - row;
    const dy = y - 15.5;

    for (let x = 0; x < width; x++) {
      const dx = x - 15.5;
      const dist = Math.hypot(dx, dy);
      const offset = (row * width + x) * 4;

      if (dist > 15.5) {
        // Transparent
        pixelData[offset] = 0; // B
        pixelData[offset + 1] = 0; // G
        pixelData[offset + 2] = 0; // R
        pixelData[offset + 3] = 0; // A
        continue;
      }

      // Check Bar 1 (Lime: #D1FF42 -> R: 209, G: 255, B: 66)
      // center offset dx ~ -3.5, rotated -12 deg
      const lx1 = dx * Math.cos(rad1) - dy * Math.sin(rad1);
      const ly1 = dx * Math.sin(rad1) + dy * Math.cos(rad1);

      // Check Bar 2 (White: #FFFFFF -> R: 255, G: 255, B: 255)
      // center offset dx ~ +3.5, rotated +6 deg
      const lx2 = dx * Math.cos(rad2) - dy * Math.sin(rad2);
      const ly2 = dx * Math.sin(rad2) + dy * Math.cos(rad2);

      let r = 20,
        g = 33,
        b = 61,
        a = 255; // #14213D

      // Anti-aliasing circle boundary
      if (dist > 14.5) {
        a = Math.round(255 * (15.5 - dist));
      }

      const inBar1 = Math.abs(lx1 - -3.2) <= 1.6 && Math.abs(ly1) <= 7;
      const inBar2 = Math.abs(lx2 - 3.2) <= 1.6 && Math.abs(ly2) <= 7;

      if (inBar1) {
        r = 209;
        g = 255;
        b = 66;
      } else if (inBar2) {
        r = 255;
        g = 255;
        b = 255;
      }

      pixelData[offset] = b;
      pixelData[offset + 1] = g;
      pixelData[offset + 2] = r;
      pixelData[offset + 3] = a;
    }
  }

  // AND mask: 1 bit per pixel, padded to 32-bit boundary per row (32 bits = 4 bytes per row)
  const andMask = Buffer.alloc(width * (height / 8), 0);

  const bmpHeaderSize = 40;
  const imageSize = bmpHeaderSize + pixelData.length + andMask.length;
  const totalIcoSize = 6 + 16 + imageSize;

  const ico = Buffer.alloc(totalIcoSize);

  // ICO header
  ico.writeUInt16LE(0, 0); // reserved
  ico.writeUInt16LE(1, 2); // type = 1 (icon)
  ico.writeUInt16LE(1, 4); // count = 1 image

  // Directory entry
  ico.writeUInt8(width, 6);
  ico.writeUInt8(height, 7);
  ico.writeUInt8(0, 8); // color count
  ico.writeUInt8(0, 9); // reserved
  ico.writeUInt16LE(1, 10); // color planes
  ico.writeUInt16LE(32, 12); // bpp
  ico.writeUInt32LE(imageSize, 14); // image size
  ico.writeUInt32LE(22, 18); // offset

  // BITMAPINFOHEADER
  let pos = 22;
  ico.writeUInt32LE(40, pos); // biSize
  ico.writeInt32LE(width, pos + 4); // biWidth
  ico.writeInt32LE(height * 2, pos + 8); // biHeight (XOR + AND)
  ico.writeUInt16LE(1, pos + 12); // biPlanes
  ico.writeUInt16LE(32, pos + 14); // biBitCount
  ico.writeUInt32LE(0, pos + 16); // biCompression = BI_RGB
  ico.writeUInt32LE(pixelData.length, pos + 20); // biSizeImage
  ico.writeInt32LE(0, pos + 24); // biXPelsPerMeter
  ico.writeInt32LE(0, pos + 28); // biYPelsPerMeter
  ico.writeUInt32LE(0, pos + 32); // biClrUsed
  ico.writeUInt32LE(0, pos + 36); // biClrImportant
  pos += 40;

  // Copy pixel data
  pixelData.copy(ico, pos);
  pos += pixelData.length;

  // Copy AND mask
  andMask.copy(ico, pos);

  fs.writeFileSync("public/favicon.ico", ico);
  console.log("Wrote public/favicon.ico (size: " + ico.length + " bytes)");
}

generateIco32();

function writePng(size, filename) {
  const signature = Buffer.from([137,80,78,71,13,10,26,10]);
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const name = Buffer.from(type);
    const crc = Buffer.alloc(4);
    const crcTable = globalThis.__pngCrc ??= (() => {
      const table = [];
      for (let n=0;n<256;n++) {
        let c=n;
        for (let k=0;k<8;k++) c=(c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        table[n]=c >>> 0;
      }
      return table;
    })();
    let crcValue=0xffffffff;
    for (const byte of Buffer.concat([name,data])) {
      crcValue=crcTable[(crcValue ^ byte) & 0xff] ^ (crcValue >>> 8);
    }
    crc.writeUInt32BE((crcValue ^ 0xffffffff) >>> 0);
    return Buffer.concat([len,name,data,crc]);
  };
  const ihdr=Buffer.alloc(13);
  ihdr.writeUInt32BE(size,0);
  ihdr.writeUInt32BE(size,4);
  ihdr[8]=8; ihdr[9]=6;
  const rows=[];
  for (let y=0;y<size;y++) {
    rows.push(Buffer.from([0]));
    const row=Buffer.alloc(size*4);
    for (let x=0;x<size;x++) {
      const i=(x*4);
      const margin=size*0.125;
      const inside=x>=margin && x<=size-margin && y>=margin && y<=size-margin;
      const dx=(x-size/2)/(size/2);
      const dy=(y-size/2)/(size/2);
      const onG=inside && Math.abs(dx)<=0.18 && dy>-0.42 && dy<0.42;
      row[i]=onG?255:inside?2:248;
      row[i+1]=onG?255:inside?81:250;
      row[i+2]=onG?255:inside?176:252;
      row[i+3]=255;
    }
    rows.push(row);
  }
  const png=Buffer.concat([signature,chunk("IHDR",ihdr),chunk("IDAT",zlib.deflateSync(Buffer.concat(rows))),chunk("IEND",Buffer.alloc(0))]);
  fs.writeFileSync(filename,png);
  console.log(`Wrote ${filename}`);
}

writePng(192,"public/icon-192.png");
writePng(512,"public/icon-512.png");
