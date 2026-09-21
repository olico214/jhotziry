import { createHash } from "node:crypto";

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFromString(value) {
  return createHash("sha256").update(String(value)).digest().readUInt32BE(0);
}

function hslToRgb(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [f(0), f(8), f(4)];
}

function align4(value) {
  return (value + 3) & ~3;
}

function buildSphere(seed) {
  const rng = mulberry32(seed);
  const rings = 32;
  const segments = 48;
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  const ph1 = rng() * Math.PI * 2;
  const ph2 = rng() * Math.PI * 2;
  const ph3 = rng() * Math.PI * 2;
  const amp = 0.07 + rng() * 0.09;
  const squash = 0.85 + rng() * 0.4;

  for (let i = 0; i <= rings; i++) {
    const v = i / rings;
    const theta = v * Math.PI;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let j = 0; j <= segments; j++) {
      const u = j / segments;
      const phi = u * Math.PI * 2;

      let x = sinTheta * Math.cos(phi);
      let y = cosTheta * squash;
      let z = sinTheta * Math.sin(phi);

      const wobble =
        Math.sin(3 * phi + ph1) * Math.cos(2 * theta + ph2) * amp +
        Math.sin(5 * theta + ph3) * amp * 0.5;
      const radius = 1 + wobble;

      x *= radius;
      y *= radius;
      z *= radius;

      positions.push(x, y, z);

      const length = Math.hypot(x, y, z) || 1;
      normals.push(x / length, y / length, z / length);

      uvs.push(u, 1 - v);
    }
  }

  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * (segments + 1) + j;
      const b = a + segments + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  return { positions, normals, uvs, indices };
}

export function buildMockGlb({ seed = 0, hueShift = 0 } = {}) {
  const { positions, normals, uvs, indices } = buildSphere(seed);

  const positionBuffer = Buffer.from(new Float32Array(positions).buffer);
  const normalBuffer = Buffer.from(new Float32Array(normals).buffer);
  const uvBuffer = Buffer.from(new Float32Array(uvs).buffer);
  const indexBuffer = Buffer.from(new Uint16Array(indices).buffer);

  const positionOffset = 0;
  const normalOffset = positionOffset + positionBuffer.length;
  const uvOffset = normalOffset + normalBuffer.length;
  const indexOffset = uvOffset + uvBuffer.length;
  const binLength = indexOffset + indexBuffer.length;

  const bin = Buffer.alloc(align4(binLength));
  positionBuffer.copy(bin, positionOffset);
  normalBuffer.copy(bin, normalOffset);
  uvBuffer.copy(bin, uvOffset);
  indexBuffer.copy(bin, indexOffset);

  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let axis = 0; axis < 3; axis++) {
      const value = positions[i + axis];
      if (value < min[axis]) min[axis] = value;
      if (value > max[axis]) max[axis] = value;
    }
  }

  const hue = (330 + hueShift) % 360;
  const color = hslToRgb(hue, 0.72, 0.76);

  const gltf = {
    asset: { version: "2.0", generator: "jhotziry-mock" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: "Modelo" }],
    meshes: [
      {
        name: "Modelo",
        primitives: [
          {
            attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 },
            indices: 3,
            material: 0,
          },
        ],
      },
    ],
    materials: [
      {
        name: "Pastel",
        pbrMetallicRoughness: {
          baseColorFactor: [color[0], color[1], color[2], 1],
          metallicFactor: 0.1,
          roughnessFactor: 0.55,
        },
        doubleSided: true,
      },
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: positions.length / 3,
        type: "VEC3",
        min,
        max,
      },
      {
        bufferView: 1,
        componentType: 5126,
        count: normals.length / 3,
        type: "VEC3",
      },
      {
        bufferView: 2,
        componentType: 5126,
        count: uvs.length / 2,
        type: "VEC2",
      },
      {
        bufferView: 3,
        componentType: 5123,
        count: indices.length,
        type: "SCALAR",
      },
    ],
    bufferViews: [
      {
        buffer: 0,
        byteOffset: positionOffset,
        byteLength: positionBuffer.length,
        target: 34962,
      },
      {
        buffer: 0,
        byteOffset: normalOffset,
        byteLength: normalBuffer.length,
        target: 34962,
      },
      {
        buffer: 0,
        byteOffset: uvOffset,
        byteLength: uvBuffer.length,
        target: 34962,
      },
      {
        buffer: 0,
        byteOffset: indexOffset,
        byteLength: indexBuffer.length,
        target: 34963,
      },
    ],
    buffers: [{ byteLength: bin.length }],
  };

  const json = Buffer.from(JSON.stringify(gltf), "utf8");
  const jsonPadded = Buffer.alloc(align4(json.length), 0x20);
  json.copy(jsonPadded);

  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + jsonPadded.length + 8 + bin.length, 8);

  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonPadded.length, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4);

  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(bin.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4);

  return Buffer.concat([header, jsonHeader, jsonPadded, binHeader, bin]);
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapText(text, maxChars) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = (current + " " + word).trim();
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 5);
}

export function buildMockPreview({ prompt, hueShift = 0 }) {
  const hue = (330 + hueShift) % 360;
  const lines = wrapText(prompt, 30);
  const startY = 320 - (lines.length - 1) * 26;
  const tspans = lines
    .map(
      (line, index) =>
        `<tspan x="256" y="${startY + index * 52}">${escapeXml(line)}</tspan>`,
    )
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="bg" cx="30%" cy="20%" r="90%">
      <stop offset="0%" stop-color="hsl(${hue}, 90%, 92%)"/>
      <stop offset="100%" stop-color="hsl(${(hue + 20) % 360}, 80%, 82%)"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" rx="48" fill="url(#bg)"/>
  <circle cx="256" cy="190" r="96" fill="hsl(${hue}, 75%, 80%)"/>
  <circle cx="256" cy="190" r="96" fill="none" stroke="hsl(${hue}, 60%, 70%)" stroke-width="6"/>
  <circle cx="224" cy="176" r="12" fill="#4a2b3b"/>
  <circle cx="288" cy="176" r="12" fill="#4a2b3b"/>
  <path d="M226 224 Q256 250 286 224" stroke="#4a2b3b" stroke-width="8" fill="none" stroke-linecap="round"/>
  <text text-anchor="middle" font-family="Nunito, Arial, sans-serif" font-size="34" font-weight="700" fill="#4a2b3b">${tspans}</text>
  <text x="256" y="452" text-anchor="middle" font-family="Nunito, Arial, sans-serif" font-size="20" fill="#8a6478">Vista previa generada</text>
</svg>`;

  return Buffer.from(svg, "utf8");
}
