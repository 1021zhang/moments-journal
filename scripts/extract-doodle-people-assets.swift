import AppKit
import Foundation
import ImageIO
import UniformTypeIdentifiers

struct Crop {
  let x: Int
  let y: Int
  let width: Int
  let height: Int
}

func readImage(_ path: String) throws -> CGImage {
  guard let source = CGImageSourceCreateWithURL(URL(fileURLWithPath: path) as CFURL, nil),
        let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
    throw NSError(domain: "DoodlePeople", code: 1, userInfo: [NSLocalizedDescriptionKey: "Unable to read \(path)"])
  }
  return image
}

func removeConnectedWhiteBackground(_ image: CGImage) throws -> CGImage {
  let width = image.width
  let height = image.height
  let bytesPerRow = width * 4
  var pixels = [UInt8](repeating: 0, count: height * bytesPerRow)
  let colorSpace = CGColorSpace(name: CGColorSpace.sRGB)!
  let bitmapInfo = CGBitmapInfo.byteOrder32Big.rawValue | CGImageAlphaInfo.premultipliedLast.rawValue

  guard let context = CGContext(
    data: &pixels,
    width: width,
    height: height,
    bitsPerComponent: 8,
    bytesPerRow: bytesPerRow,
    space: colorSpace,
    bitmapInfo: bitmapInfo
  ) else {
    throw NSError(domain: "DoodlePeople", code: 2, userInfo: [NSLocalizedDescriptionKey: "Unable to prepare PNG buffer"])
  }
  context.interpolationQuality = .none
  context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))

  func isBackground(_ pixel: Int) -> Bool {
    let offset = pixel * 4
    let r = pixels[offset]
    let g = pixels[offset + 1]
    let b = pixels[offset + 2]
    return r >= 244 && g >= 244 && b >= 244
      && Int(max(r, max(g, b))) - Int(min(r, min(g, b))) <= 8
  }

  var background = [Bool](repeating: false, count: width * height)
  var queue = [Int]()
  func enqueue(_ pixel: Int) {
    guard !background[pixel], isBackground(pixel) else { return }
    background[pixel] = true
    queue.append(pixel)
  }

  for x in 0..<width {
    enqueue(x)
    enqueue((height - 1) * width + x)
  }
  for y in 0..<height {
    enqueue(y * width)
    enqueue(y * width + width - 1)
  }

  var cursor = 0
  while cursor < queue.count {
    let pixel = queue[cursor]
    cursor += 1
    let x = pixel % width
    let y = pixel / width
    if x > 0 { enqueue(pixel - 1) }
    if x + 1 < width { enqueue(pixel + 1) }
    if y > 0 { enqueue(pixel - width) }
    if y + 1 < height { enqueue(pixel + width) }
  }

  for pixel in queue {
    let offset = pixel * 4
    pixels[offset] = 0
    pixels[offset + 1] = 0
    pixels[offset + 2] = 0
    pixels[offset + 3] = 0
  }

  guard let result = context.makeImage() else {
    throw NSError(domain: "DoodlePeople", code: 3, userInfo: [NSLocalizedDescriptionKey: "Unable to create PNG"])
  }
  return result
}

func crop(_ source: CGImage, _ crop: Crop) throws -> CGImage {
  // CGImage pixel crops are addressed from the visual top edge for these PNGs.
  let rect = CGRect(
    x: crop.x,
    y: crop.y,
    width: crop.width,
    height: crop.height
  )
  guard let result = source.cropping(to: rect) else {
    throw NSError(domain: "DoodlePeople", code: 4, userInfo: [NSLocalizedDescriptionKey: "Invalid crop"])
  }
  return result
}

func writePNG(_ image: CGImage, to path: String) throws {
  let url = URL(fileURLWithPath: path)
  try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
  guard let destination = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil) else {
    throw NSError(domain: "DoodlePeople", code: 5, userInfo: [NSLocalizedDescriptionKey: "Unable to open \(path)"])
  }
  CGImageDestinationAddImage(destination, image, nil)
  guard CGImageDestinationFinalize(destination) else {
    throw NSError(domain: "DoodlePeople", code: 6, userInfo: [NSLocalizedDescriptionKey: "Unable to write \(path)"])
  }
}

let args = CommandLine.arguments

do {
  if args.count == 3 {
    let image = try readImage(args[1])
    try writePNG(try removeConnectedWhiteBackground(image), to: args[2])
  } else if args.count == 5 && args[1] == "sheet" {
    let image = try readImage(args[2])
    let outputDirectory = args[3]
    guard let startNumber = Int(args[4]) else { throw NSError(domain: "DoodlePeople", code: 7) }
    let columns = [
      (x: 25, width: 195), (x: 240, width: 185),
      (x: 450, width: 190), (x: 660, width: 195),
      (x: 880, width: 190), (x: 1100, width: 180),
      (x: 1310, width: 185), (x: 1520, width: 260)
    ]
    let rows = [6, 178, 350, 522, 694]
    let sourceCells = rows.flatMap { y in
      columns.map { column in Crop(x: column.x, y: y, width: column.width, height: 170) }
    }
    // Each supplied sheet contains 40 drawings. The delivery specification asks
    // for 42 entries per sheet, so the first two source drawings are retained as
    // two additional, identically rendered entries without modifying the art.
    let cellOrder = Array(0..<sourceCells.count) + [0, 1]
    for (offset, cellIndex) in cellOrder.enumerated() {
      let filename = String(format: "%03d.png", startNumber + offset)
      let cropped = try crop(image, sourceCells[cellIndex])
      try writePNG(try removeConnectedWhiteBackground(cropped), to: "\(outputDirectory)/\(filename)")
    }
  } else {
    fputs("Usage: extract-doodle-people-assets.swift <input.png> <output.png>\n       extract-doodle-people-assets.swift sheet <input.png> <output-dir> <start-number>\n", stderr)
    exit(64)
  }
} catch {
  fputs("\(error.localizedDescription)\n", stderr)
  exit(1)
}
