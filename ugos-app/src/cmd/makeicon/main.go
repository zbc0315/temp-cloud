// Command makeicon renders the 256x256 application icon for the Temp Cloud
// UGOS Pro application.
//
// It uses only the Go standard library, so the build toolchain needs nothing
// beyond Go itself. Shapes are rasterised at 4x and box-filtered down, which
// reproduces the anti-aliased result the previous Pillow-based generator
// produced.
//
// Usage (from the src directory):
//
//	go run ./cmd/makeicon -out ../rootfs_common/icon.png
package main

import (
	"flag"
	"fmt"
	"image"
	"image/color"
	"image/png"
	"math"
	"os"
	"path/filepath"
)

const (
	outSize = 256
	ss      = 4 // supersampling factor
	n       = outSize * ss
)

var (
	bg     = color.NRGBA{R: 0xf4, G: 0xf1, B: 0xea, A: 0xff} // #f4f1ea, the app's light background
	accent = color.NRGBA{R: 0xba, G: 0x4a, B: 0x2f, A: 0xff} // #ba4a2f, the app's accent colour
	stroke = color.NRGBA{A: 0x14}                            // 8% black
)

// sc converts a coordinate expressed in 256-space to supersampled space.
func sc(v float64) float64 { return math.Round(v * ss) }

// ---------------------------------------------------------------- raster

type canvas struct {
	w, h int
	pix  []color.NRGBA
}

func newCanvas(w, h int) *canvas {
	return &canvas{w: w, h: h, pix: make([]color.NRGBA, w*h)}
}

func (c *canvas) set(x, y int, col color.NRGBA) {
	if x < 0 || y < 0 || x >= c.w || y >= c.h {
		return
	}
	c.pix[y*c.w+x] = col
}

// blend composites col over the existing pixel using source-over.
func (c *canvas) blend(x, y int, col color.NRGBA) {
	if x < 0 || y < 0 || x >= c.w || y >= c.h {
		return
	}
	i := y*c.w + x
	dst := c.pix[i]

	sa := float64(col.A) / 255
	da := float64(dst.A) / 255
	outA := sa + da*(1-sa)
	if outA == 0 {
		c.pix[i] = color.NRGBA{}
		return
	}

	mix := func(s, d uint8) uint8 {
		v := (float64(s)*sa + float64(d)*da*(1-sa)) / outA
		return uint8(math.Round(math.Min(255, math.Max(0, v))))
	}

	c.pix[i] = color.NRGBA{
		R: mix(col.R, dst.R),
		G: mix(col.G, dst.G),
		B: mix(col.B, dst.B),
		A: uint8(math.Round(outA * 255)),
	}
}

// predicate reports whether the pixel centre (x, y) lies inside a shape.
type predicate func(x, y float64) bool

func (c *canvas) fill(inside predicate, col color.NRGBA) {
	for y := 0; y < c.h; y++ {
		for x := 0; x < c.w; x++ {
			if inside(float64(x)+0.5, float64(y)+0.5) {
				c.set(x, y, col)
			}
		}
	}
}

func (c *canvas) fillBlend(inside predicate, col color.NRGBA) {
	for y := 0; y < c.h; y++ {
		for x := 0; x < c.w; x++ {
			if inside(float64(x)+0.5, float64(y)+0.5) {
				c.blend(x, y, col)
			}
		}
	}
}

// ---------------------------------------------------------------- shapes

// roundedRect matches Pillow's rounded_rectangle: a rectangle with quarter
// circles of radius r at each corner.
func roundedRect(x0, y0, x1, y1, r float64) predicate {
	return func(x, y float64) bool {
		if x < x0 || x > x1 || y < y0 || y > y1 {
			return false
		}
		cx := math.Min(math.Max(x, x0+r), x1-r)
		cy := math.Min(math.Max(y, y0+r), y1-r)
		dx, dy := x-cx, y-cy
		return dx*dx+dy*dy <= r*r
	}
}

// ellipse matches Pillow's ellipse: inscribed in the bounding box.
func ellipse(x0, y0, x1, y1 float64) predicate {
	cx, cy := (x0+x1)/2, (y0+y1)/2
	rx, ry := (x1-x0)/2, (y1-y0)/2
	if rx <= 0 || ry <= 0 {
		return func(float64, float64) bool { return false }
	}
	return func(x, y float64) bool {
		dx, dy := (x-cx)/rx, (y-cy)/ry
		return dx*dx+dy*dy <= 1
	}
}

func rect(x0, y0, x1, y1 float64) predicate {
	return func(x, y float64) bool { return x >= x0 && x <= x1 && y >= y0 && y <= y1 }
}

func triangle(ax, ay, bx, by, cx, cy float64) predicate {
	side := func(px, py, qx, qy, rx, ry float64) float64 {
		return (px-rx)*(qy-ry) - (qx-rx)*(py-ry)
	}
	return func(x, y float64) bool {
		d1 := side(x, y, ax, ay, bx, by)
		d2 := side(x, y, bx, by, cx, cy)
		d3 := side(x, y, cx, cy, ax, ay)
		hasNeg := d1 < 0 || d2 < 0 || d3 < 0
		hasPos := d1 > 0 || d2 > 0 || d3 > 0
		return !(hasNeg && hasPos)
	}
}

// ---------------------------------------------------------------- output

// downsample box-filters the supersampled canvas in premultiplied space, so the
// rounded corners do not pick up a dark fringe from transparent neighbours.
func downsample(src *canvas, factor int) *image.NRGBA {
	w, h := src.w/factor, src.h/factor
	out := image.NewNRGBA(image.Rect(0, 0, w, h))
	count := uint64(factor * factor)

	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			var sr, sg, sb, sa uint64
			for dy := 0; dy < factor; dy++ {
				row := (y*factor + dy) * src.w
				for dx := 0; dx < factor; dx++ {
					p := src.pix[row+x*factor+dx]
					a := uint64(p.A)
					sr += uint64(p.R) * a
					sg += uint64(p.G) * a
					sb += uint64(p.B) * a
					sa += a
				}
			}
			if sa == 0 {
				out.SetNRGBA(x, y, color.NRGBA{})
				continue
			}
			out.SetNRGBA(x, y, color.NRGBA{
				R: uint8(sr / sa),
				G: uint8(sg / sa),
				B: uint8(sb / sa),
				A: uint8(sa / count),
			})
		}
	}
	return out
}

func main() {
	out := flag.String("out", filepath.Join("..", "rootfs_common", "icon.png"),
		"path of the PNG file to write")
	flag.Parse()

	c := newCanvas(n, n)

	// Rounded-square tile.
	c.fill(roundedRect(0, 0, n-1, n-1, sc(56)), bg)

	// Subtle 0.5px border in 8% black: the ring between two rounded rectangles.
	const bw = 0.5
	outer := roundedRect(sc(bw), sc(bw), n-1-sc(bw), n-1-sc(bw), sc(56))
	inner := roundedRect(sc(bw)+sc(bw), sc(bw)+sc(bw), n-1-sc(bw)-sc(bw), n-1-sc(bw)-sc(bw), sc(56)-sc(bw))
	c.fillBlend(func(x, y float64) bool { return outer(x, y) && !inner(x, y) }, stroke)

	// Cloud body: three symmetric lobes over a flat base, centred at x=128.
	lobes := [][4]float64{
		{80, 84, 176, 180},   // main lobe
		{48, 122, 112, 186},  // left lobe
		{144, 122, 208, 186}, // right lobe
	}
	for _, b := range lobes {
		c.fill(ellipse(sc(b[0]), sc(b[1]), sc(b[2]), sc(b[3])), accent)
	}
	c.fill(roundedRect(sc(48), sc(150), sc(208), sc(186), sc(18)), accent)

	// Upload arrow knocked out of the cloud in the tile background colour.
	c.fill(rect(sc(118), sc(128), sc(138), sc(178)), bg)
	c.fill(triangle(sc(96), sc(140), sc(160), sc(140), sc(128), sc(102)), bg)

	icon := downsample(c, ss)
	if icon.Bounds().Dx() != outSize || icon.Bounds().Dy() != outSize {
		fmt.Fprintf(os.Stderr, "makeicon: unexpected size %v\n", icon.Bounds().Size())
		os.Exit(1)
	}

	if dir := filepath.Dir(*out); dir != "" && dir != "." {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			fmt.Fprintf(os.Stderr, "makeicon: %v\n", err)
			os.Exit(1)
		}
	}

	f, err := os.Create(*out)
	if err != nil {
		fmt.Fprintf(os.Stderr, "makeicon: %v\n", err)
		os.Exit(1)
	}
	defer f.Close()

	// png.BestCompression keeps the file well inside the documented 100 KiB cap.
	enc := png.Encoder{CompressionLevel: png.BestCompression}
	if err := enc.Encode(f, icon); err != nil {
		fmt.Fprintf(os.Stderr, "makeicon: %v\n", err)
		os.Exit(1)
	}
	if err := f.Close(); err != nil {
		fmt.Fprintf(os.Stderr, "makeicon: %v\n", err)
		os.Exit(1)
	}

	st, err := os.Stat(*out)
	if err != nil {
		fmt.Fprintf(os.Stderr, "makeicon: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("  %s  %dx%d  %d bytes (%.1f KiB)\n",
		*out, outSize, outSize, st.Size(), float64(st.Size())/1024)
	if st.Size() > 100*1024 {
		fmt.Fprintln(os.Stderr, "makeicon: icon exceeds the documented 100 KiB limit")
		os.Exit(1)
	}
}
