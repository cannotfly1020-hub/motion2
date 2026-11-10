import struct, zlib

def png(path, w, h, pixel):
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        for x in range(w):
            raw.extend(pixel(x, y, w, h))
    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF)
    ihdr = struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)
    data = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', zlib.compress(bytes(raw), 9)) + chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(data)

def icon_pixel(x, y, w, h):
    cx, cy = (w - 1) / 2, (h - 1) / 2
    nx, ny = (x - cx) / (w * 0.42), (y - cy) / (h * 0.42)
    if nx * nx + ny * ny <= 1:
        seam = abs(ny - 0.15 * (nx * nx)) < 0.08 or abs(ny + 0.15 * (nx * nx)) < 0.08
        if seam and abs(nx) < 0.85:
            return (190, 40, 40, 255)
        return (248, 248, 248, 255)
    return (2, 132, 199, 255)

def splash_pixel(x, y, w, h):
    return (2, 132, 199, 255)

png('assets/icon-only.png', 1024, 1024, icon_pixel)
png('assets/splash.png', 1024, 1024, splash_pixel)
png('icon-192.png', 192, 192, icon_pixel)
png('icon-512.png', 512, 512, icon_pixel)
print('icons written')
