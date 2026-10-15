/**
 * Packs items into rows greedily, the way CSS flex-wrap does: a new row starts
 * when the next item would overflow maxWidth. An item wider than maxWidth gets
 * a row to itself. Returns the item indices of each row, in order.
 */
export function packRows(widths: number[], maxWidth: number): number[][] {
  const rows: number[][] = []
  let row: number[] = []
  let used = 0

  widths.forEach((width, i) => {
    if (row.length > 0 && used + width > maxWidth) {
      rows.push(row)
      row = []
      used = 0
    }
    row.push(i)
    used += width
  })

  if (row.length > 0) rows.push(row)
  return rows
}

/**
 * Packs into the same number of rows as packRows would, but with the rows as
 * even as possible (like CSS text-wrap: balance), so a line never ends with a
 * lone letter on its last row. Finds the narrowest width that still needs no
 * more rows than the greedy packing.
 */
export function packBalanced(widths: number[], maxWidth: number): number[][] {
  const count = packRows(widths, maxWidth).length
  if (count <= 1) return packRows(widths, maxWidth)

  let lo = Math.max(...widths)
  let hi = maxWidth
  for (let step = 0; step < 24 && hi - lo > 0.5; step++) {
    const mid = (lo + hi) / 2
    if (packRows(widths, mid).length <= count) hi = mid
    else lo = mid
  }
  return packRows(widths, hi)
}
