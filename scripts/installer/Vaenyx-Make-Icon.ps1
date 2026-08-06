# Builds scripts/installer/vaenyx.ico from the site mark, using only what
# Windows ships (System.Drawing) - no paid tools, no npm packages.
#
# The source of truth for the mark is apps/web/public/vaenyx-icon-1024.png (the
# same image the web app serves as its PWA icon). This script scales it to the
# standard Windows icon sizes and writes one multi-size .ico:
#   16/20/24/32/40/48 as classic 32-bit BMP entries (what every shell dialog
#   expects), 64/128/256 as PNG-compressed entries (supported since Vista and
#   much smaller on disk).
#
# The generated vaenyx.ico is committed, so CI and the Inno Setup compile never
# need to run this - rerun it only when the mark itself changes.
[CmdletBinding()]
param(
  [string]$SourcePng = "",
  [string]$OutputIco = ""
)

$ErrorActionPreference = "Stop"

# System.Drawing compiles cleanly under Windows PowerShell 5.1; under
# PowerShell 7 the Add-Type reference list is different and fragile. Re-run
# ourselves under 5.1 (present on every Windows machine) instead of branching.
if ($PSVersionTable.PSEdition -eq "Core") {
  $forward = @()
  if ($SourcePng) { $forward += @("-SourcePng", $SourcePng) }
  if ($OutputIco) { $forward += @("-OutputIco", $OutputIco) }
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $PSCommandPath @forward
  exit $LASTEXITCODE
}

$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
if (-not $SourcePng) { $SourcePng = Join-Path $root "apps\web\public\vaenyx-icon-1024.png" }
if (-not $OutputIco) { $OutputIco = Join-Path $PSScriptRoot "vaenyx.ico" }
if (-not (Test-Path $SourcePng)) { throw "Source image not found: $SourcePng" }

Add-Type -AssemblyName System.Drawing

Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;

public static class VaenyxIconWriter
{
    // Sizes from this up are stored PNG-compressed; below it, classic BMP.
    const int PngThreshold = 64;

    public static void Write(string sourcePng, string outputIco, int[] sizes)
    {
        using (var source = new Bitmap(sourcePng))
        {
            var images = new List<byte[]>();
            foreach (var size in sizes)
            {
                using (var frame = new Bitmap(size, size, PixelFormat.Format32bppArgb))
                {
                    using (var g = Graphics.FromImage(frame))
                    {
                        g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                        g.SmoothingMode = SmoothingMode.HighQuality;
                        g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                        g.DrawImage(source, new Rectangle(0, 0, size, size));
                    }
                    if (size >= PngThreshold)
                    {
                        using (var ms = new MemoryStream())
                        {
                            frame.Save(ms, ImageFormat.Png);
                            images.Add(ms.ToArray());
                        }
                    }
                    else
                    {
                        images.Add(EncodeBmpEntry(frame));
                    }
                }
            }
            using (var output = new FileStream(outputIco, FileMode.Create, FileAccess.Write))
            using (var writer = new BinaryWriter(output))
            {
                writer.Write((ushort)0); // reserved
                writer.Write((ushort)1); // type 1 = icon
                writer.Write((ushort)sizes.Length);
                int offset = 6 + 16 * sizes.Length;
                for (int i = 0; i < sizes.Length; i++)
                {
                    int size = sizes[i];
                    writer.Write((byte)(size >= 256 ? 0 : size)); // 0 means 256
                    writer.Write((byte)(size >= 256 ? 0 : size));
                    writer.Write((byte)0);   // no palette
                    writer.Write((byte)0);   // reserved
                    writer.Write((ushort)1); // colour planes
                    writer.Write((ushort)32);
                    writer.Write((uint)images[i].Length);
                    writer.Write((uint)offset);
                    offset += images[i].Length;
                }
                for (int i = 0; i < sizes.Length; i++) writer.Write(images[i]);
            }
        }
    }

    // A classic ICO bitmap entry: BITMAPINFOHEADER with doubled height, the
    // 32-bit BGRA pixels bottom-up, then the 1-bit AND mask (all zero - the
    // alpha channel is what actually shapes the icon).
    static byte[] EncodeBmpEntry(Bitmap frame)
    {
        int w = frame.Width, h = frame.Height;
        int maskStride = ((w + 31) / 32) * 4;
        using (var ms = new MemoryStream())
        using (var writer = new BinaryWriter(ms))
        {
            writer.Write((uint)40); // BITMAPINFOHEADER size
            writer.Write((int)w);
            writer.Write((int)(h * 2)); // XOR plane + AND plane
            writer.Write((ushort)1);
            writer.Write((ushort)32);
            writer.Write((uint)0);      // BI_RGB
            writer.Write((uint)(w * h * 4 + maskStride * h));
            writer.Write((int)0); writer.Write((int)0);   // resolution
            writer.Write((uint)0); writer.Write((uint)0); // colours
            for (int y = h - 1; y >= 0; y--)
                for (int x = 0; x < w; x++)
                    // ToArgb() little-endian happens to be the BGRA byte order
                    // the format wants.
                    writer.Write(frame.GetPixel(x, y).ToArgb());
            var maskRow = new byte[maskStride];
            for (int y = 0; y < h; y++) writer.Write(maskRow);
            return ms.ToArray();
        }
    }
}
"@

$sizes = @(16, 20, 24, 32, 40, 48, 64, 128, 256)
[VaenyxIconWriter]::Write($SourcePng, $OutputIco, $sizes)

$sizeKb = [math]::Round((Get-Item $OutputIco).Length / 1KB, 1)
Write-Host "Wrote $OutputIco ($sizeKb KB, sizes: $($sizes -join ', '))"
