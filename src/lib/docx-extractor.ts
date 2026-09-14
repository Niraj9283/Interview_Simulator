/**
 * Zero-dependency client-side DOCX text extractor.
 * DOCX files are ZIP archives containing word/document.xml.
 * Uses native browser DecompressionStream or regex/string scanning.
 */

export async function extractTextFromDocx(file: File | Blob): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Locate the zip entry for 'word/document.xml'
    const targetName = "word/document.xml";
    const xmlContent = await extractZipEntry(bytes, targetName);

    if (xmlContent) {
      return parseDocxXml(xmlContent);
    }
  } catch (err) {
    console.warn("Client-side DOCX extraction attempt failed:", err);
  }

  // Fallback: extract printable strings from raw buffer
  return extractPrintableStrings(await file.text());
}

async function extractZipEntry(bytes: Uint8Array, entryName: string): Promise<string | null> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;

  while (offset + 30 <= bytes.length) {
    // Check for Local File Header signature 0x04034b50 (PK\x03\x04)
    if (
      bytes[offset] !== 0x50 ||
      bytes[offset + 1] !== 0x4b ||
      bytes[offset + 2] !== 0x03 ||
      bytes[offset + 3] !== 0x04
    ) {
      break;
    }

    const compressionMethod = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const fileNameLength = view.getUint16(offset + 26, true);
    const extraFieldLength = view.getUint16(offset + 28, true);

    const fileNameBytes = bytes.subarray(offset + 30, offset + 30 + fileNameLength);
    const fileName = new TextDecoder("utf-8").decode(fileNameBytes);

    const dataStart = offset + 30 + fileNameLength + extraFieldLength;
    const dataEnd = dataStart + compressedSize;

    if (fileName === entryName) {
      const entryData = bytes.subarray(dataStart, dataEnd);

      if (compressionMethod === 0) {
        // Stored (no compression)
        return new TextDecoder("utf-8").decode(entryData);
      } else if (compressionMethod === 8) {
        // Deflate compression
        if (typeof DecompressionStream !== "undefined") {
          try {
            const blob = new Blob([entryData as BlobPart]);
            const stream = blob.stream().pipeThrough(
              new DecompressionStream("deflate-raw")
            );
            const decompressedBuffer = await new Response(stream).arrayBuffer();
            return new TextDecoder("utf-8").decode(decompressedBuffer);
          } catch (streamErr) {
            console.warn("DecompressionStream error:", streamErr);
          }
        }
      }
    }

    // Advance to next entry
    if (compressedSize > 0) {
      offset = dataEnd;
    } else {
      let nextHeader = offset + 4;
      while (nextHeader + 4 <= bytes.length) {
        if (
          bytes[nextHeader] === 0x50 &&
          bytes[nextHeader + 1] === 0x4b &&
          bytes[nextHeader + 2] === 0x03 &&
          bytes[nextHeader + 3] === 0x04
        ) {
          break;
        }
        nextHeader++;
      }
      offset = nextHeader;
    }
  }

  return null;
}

function parseDocxXml(xml: string): string {
  // Extract all <w:p> paragraphs and their <w:t> text nodes
  const paragraphs: string[] = [];
  const paragraphRegex = /<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/gi;
  let pMatch: RegExpExecArray | null;

  while ((pMatch = paragraphRegex.exec(xml)) !== null) {
    const pContent = pMatch[1];
    const textRegex = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/gi;
    let tMatch: RegExpExecArray | null;
    let pText = "";

    while ((tMatch = textRegex.exec(pContent)) !== null) {
      pText += tMatch[1];
    }

    const cleaned = pText.trim();
    if (cleaned) {
      paragraphs.push(cleaned);
    }
  }

  if (paragraphs.length > 0) {
    return paragraphs.join("\n\n");
  }

  // Fallback regex strip XML tags
  return xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractPrintableStrings(raw: string): string {
  // Extract continuous alphanumeric / printable sequences
  const matches = raw.match(/[A-Za-z0-9\s.,;:()/'"-]{4,}/g);
  if (!matches) return "";
  return matches
    .filter((s) => s.trim().length > 5 && !s.includes("<?xml") && !s.includes("xmlns"))
    .join("\n");
}
