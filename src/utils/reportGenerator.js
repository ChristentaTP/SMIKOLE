/**
 * Report Generator — PDF Report bergaya Apache JMeter Dashboard
 * Menggunakan jsPDF + jspdf-autotable
 * 
 * Sections:
 * 1. Header & Title
 * 2. Test and Report Information
 * 3. APDEX (Application Performance Index) — Kualitas Air Index
 * 4. Requests Summary (Status Summary Pie-like)
 * 5. Statistics Table (per sensor)
 * 6. AI Predictions Summary
 * 7. FCR Summary
 */

import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

// ─── Color Palette (JMeter-inspired) ───
const COLORS = {
  headerBg: [8, 92, 133],      // #085C85 dark teal
  headerText: [255, 255, 255],
  sectionBg: [0, 51, 76],      // Dark blue section header
  sectionText: [255, 255, 255],
  tableBorder: [200, 200, 200],
  tableHeaderBg: [8, 92, 133],
  tableHeaderText: [255, 255, 255],
  tableAltRow: [240, 248, 255],
  pass: [114, 187, 83],        // Green
  warn: [240, 223, 34],        // Yellow
  fail: [220, 53, 69],         // Red
  textDark: [33, 37, 41],
  textMuted: [108, 117, 125],
}

/**
 * Calculate statistics for a numeric array
 */
const calcStats = (values) => {
  if (!values || values.length === 0) return null
  
  const nums = values.filter(v => typeof v === "number" && !isNaN(v))
  if (nums.length === 0) return null
  
  nums.sort((a, b) => a - b)
  
  const sum = nums.reduce((a, b) => a + b, 0)
  const avg = sum / nums.length
  const min = nums[0]
  const max = nums[nums.length - 1]
  
  const median = nums.length % 2 === 0
    ? (nums[nums.length / 2 - 1] + nums[nums.length / 2]) / 2
    : nums[Math.floor(nums.length / 2)]
  
  const percentile = (p) => {
    const idx = Math.ceil((p / 100) * nums.length) - 1
    return nums[Math.max(0, idx)]
  }
  
  return {
    count: nums.length,
    min: parseFloat(min.toFixed(2)),
    max: parseFloat(max.toFixed(2)),
    avg: parseFloat(avg.toFixed(2)),
    median: parseFloat(median.toFixed(2)),
    p90: parseFloat(percentile(90).toFixed(2)),
    p95: parseFloat(percentile(95).toFixed(2)),
    p99: parseFloat(percentile(99).toFixed(2)),
  }
}

/**
 * Classify a sensor value based on thresholds
 * @returns "aman" | "waspada" | "bahaya"
 */
const classifyValue = (value, thresholds) => {
  if (!thresholds || typeof value !== "number") return "unknown"
  
  const { amanMin, amanMax, waspMin, waspMax } = thresholds
  
  if (amanMin !== undefined && amanMax !== undefined && amanMin !== "" && amanMax !== "") {
    if (value >= amanMin && value <= amanMax) return "aman"
  }
  
  if (waspMin !== undefined && waspMax !== undefined && waspMin !== "" && waspMax !== "") {
    if (value >= waspMin && value <= waspMax) return "waspada"
  }
  
  return "bahaya"
}

/**
 * Format date to Indonesian locale string
 */
const formatDate = (d) => {
  if (!d || !(d instanceof Date) || isNaN(d)) return "-"
  return d.toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false
  })
}

/**
 * Generate JMeter-style PDF Report
 * 
 * @param {Object} options
 * @param {string} options.pondId - Pond ID
 * @param {string} options.pondName - Pond display name
 * @param {Array} options.sensors - Sensor config array from pond
 * @param {Array} options.realtimeData - All realtime documents
 * @param {Array} options.aiData - All AI prediction documents
 * @param {Array} options.fcrData - All FCR prediction documents
 * @param {string} options.periodLabel - "Semua Data" or "Mei 2026" etc.
 */
export const generatePDFReport = (options) => {
  const { pondId, pondName, sensors = [], realtimeData = [], aiData = [], fcrData = [], periodLabel = "Semua Data" } = options
  
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  let y = 10

  // ═══════════════════════════════════════════════
  // HELPER: Section header (JMeter style dark bar)
  // ═══════════════════════════════════════════════
  const drawSectionHeader = (title) => {
    if (y > pageH - 30) { pdf.addPage(); y = 10 }
    pdf.setFillColor(...COLORS.sectionBg)
    pdf.rect(10, y, pageW - 20, 8, "F")
    pdf.setFontSize(11)
    pdf.setFont("helvetica", "bold")
    pdf.setTextColor(...COLORS.sectionText)
    pdf.text(title, pageW / 2, y + 5.5, { align: "center" })
    y += 12
  }

  // ═══════════════════════════════════════════════
  // HELPER: Check page break
  // ═══════════════════════════════════════════════
  const checkPage = (need = 20) => {
    if (y > pageH - need) { pdf.addPage(); y = 10 }
  }

  // ═══════════════════════════════════════════════
  // PAGE 1: Header
  // ═══════════════════════════════════════════════
  // Title bar
  pdf.setFillColor(...COLORS.headerBg)
  pdf.rect(0, 0, pageW, 20, "F")
  pdf.setFontSize(16)
  pdf.setFont("helvetica", "bold")
  pdf.setTextColor(...COLORS.headerText)
  pdf.text("SMIKOLE Monitoring Report", pageW / 2, 13, { align: "center" })
  y = 25

  // Subtitle
  pdf.setFontSize(10)
  pdf.setTextColor(...COLORS.textMuted)
  pdf.setFont("helvetica", "normal")
  pdf.text("Sistem Monitoring Ikan Kolam Lele — Dashboard Report", pageW / 2, y, { align: "center" })
  y += 10

  // ═══════════════════════════════════════════════
  // SECTION: Test and Report Information
  // ═══════════════════════════════════════════════
  drawSectionHeader("Test and Report Information")

  // Determine start/end times
  const allDates = realtimeData.map(r => r._date).filter(d => d && !isNaN(d))
  const startTime = allDates.length > 0 ? formatDate(new Date(Math.min(...allDates.map(d => d.getTime())))) : "-"
  const endTime = allDates.length > 0 ? formatDate(new Date(Math.max(...allDates.map(d => d.getTime())))) : "-"

  const infoRows = [
    ["Kolam", `${pondName} (${pondId})`],
    ["Periode", periodLabel],
    ["Start Time", startTime],
    ["End Time", endTime],
    ["Total Realtime Records", String(realtimeData.length)],
    ["Total AI Predictions", String(aiData.length)],
    ["Total FCR Records", String(fcrData.length)],
    ["Report Generated", formatDate(new Date())],
  ]

  autoTable(pdf, {
    startY: y,
    head: [],
    body: infoRows,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2.5 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 50, fillColor: [230, 240, 250] },
      1: { cellWidth: "auto" },
    },
    margin: { left: 10, right: 10 },
    tableLineColor: COLORS.tableBorder,
    tableLineWidth: 0.2,
  })
  y = pdf.lastAutoTable.finalY + 10

  // ═══════════════════════════════════════════════
  // SECTION: Water Quality Index (APDEX-style)
  // ═══════════════════════════════════════════════
  if (sensors.length > 0 && realtimeData.length > 0) {
    drawSectionHeader("Water Quality Index (APDEX)")

    const apdexRows = []

    sensors.forEach((sensor) => {
      if (sensor.type === "heater" || sensor.type === "actuator") return

      const values = realtimeData
        .map(r => r[sensor.key])
        .filter(v => typeof v === "number" && !isNaN(v))

      if (values.length === 0) return

      const thresholds = {
        amanMin: sensor.amanMin,
        amanMax: sensor.amanMax,
        waspMin: sensor.waspMin,
        waspMax: sensor.waspMax,
      }

      let aman = 0, waspada = 0, bahaya = 0
      values.forEach(v => {
        const cls = classifyValue(v, thresholds)
        if (cls === "aman") aman++
        else if (cls === "waspada") waspada++
        else bahaya++
      })

      const total = values.length
      const apdexScore = ((aman + waspada * 0.5) / total).toFixed(3)

      apdexRows.push([
        apdexScore,
        `Aman: ${sensor.amanMin ?? "-"} — ${sensor.amanMax ?? "-"}`,
        `Waspada: ${sensor.waspMin ?? "-"} — ${sensor.waspMax ?? "-"}`,
        sensor.label || sensor.key,
        `${((aman / total) * 100).toFixed(1)}% Aman, ${((waspada / total) * 100).toFixed(1)}% Waspada, ${((bahaya / total) * 100).toFixed(1)}% Bahaya`,
      ])
    })

    if (apdexRows.length > 0) {
      autoTable(pdf, {
        startY: y,
        head: [["APDEX", "T (Aman Threshold)", "F (Waspada Threshold)", "Label", "Distribusi"]],
        body: apdexRows,
        theme: "grid",
        headStyles: { fillColor: COLORS.tableHeaderBg, textColor: COLORS.tableHeaderText, fontSize: 8, fontStyle: "bold" },
        styles: { fontSize: 8, cellPadding: 2 },
        alternateRowStyles: { fillColor: COLORS.tableAltRow },
        margin: { left: 10, right: 10 },
      })
      y = pdf.lastAutoTable.finalY + 10
    }
  }

  // ═══════════════════════════════════════════════
  // SECTION: Requests Summary (Status Summary)
  // ═══════════════════════════════════════════════
  if (sensors.length > 0 && realtimeData.length > 0) {
    checkPage(40)
    drawSectionHeader("Status Summary")

    let totalAman = 0, totalWaspada = 0, totalBahaya = 0, totalReadings = 0

    sensors.forEach((sensor) => {
      if (sensor.type === "heater" || sensor.type === "actuator") return

      const thresholds = {
        amanMin: sensor.amanMin, amanMax: sensor.amanMax,
        waspMin: sensor.waspMin, waspMax: sensor.waspMax,
      }

      realtimeData.forEach(r => {
        const v = r[sensor.key]
        if (typeof v !== "number" || isNaN(v)) return
        totalReadings++
        const cls = classifyValue(v, thresholds)
        if (cls === "aman") totalAman++
        else if (cls === "waspada") totalWaspada++
        else totalBahaya++
      })
    })

    if (totalReadings > 0) {
      const summaryRows = [
        ["AMAN (Safe)", String(totalAman), `${((totalAman / totalReadings) * 100).toFixed(1)}%`],
        ["WASPADA (Warning)", String(totalWaspada), `${((totalWaspada / totalReadings) * 100).toFixed(1)}%`],
        ["BAHAYA (Danger)", String(totalBahaya), `${((totalBahaya / totalReadings) * 100).toFixed(1)}%`],
        ["Total Readings", String(totalReadings), "100%"],
      ]

      autoTable(pdf, {
        startY: y,
        head: [["Status", "Count", "Percentage"]],
        body: summaryRows,
        theme: "grid",
        headStyles: { fillColor: COLORS.tableHeaderBg, textColor: COLORS.tableHeaderText, fontSize: 9, fontStyle: "bold" },
        styles: { fontSize: 9, cellPadding: 2.5 },
        margin: { left: 10, right: pageW / 2 + 5 },
        didParseCell: (data) => {
          if (data.section === "body") {
            if (data.row.index === 0) data.cell.styles.textColor = COLORS.pass
            if (data.row.index === 1) data.cell.styles.textColor = [180, 160, 0]
            if (data.row.index === 2) data.cell.styles.textColor = COLORS.fail
            if (data.row.index === 3) data.cell.styles.fontStyle = "bold"
          }
        },
      })
      y = pdf.lastAutoTable.finalY + 10
    }
  }

  // ═══════════════════════════════════════════════
  // SECTION: Statistics (per Sensor, JMeter-style)
  // ═══════════════════════════════════════════════
  checkPage(40)
  drawSectionHeader("Statistics")

  if (sensors.length > 0 && realtimeData.length > 0) {
    const statRows = []

    sensors.forEach((sensor) => {
      if (sensor.type === "heater" || sensor.type === "actuator") return

      const values = realtimeData.map(r => r[sensor.key]).filter(v => typeof v === "number" && !isNaN(v))
      const stats = calcStats(values)

      if (stats) {
        statRows.push([
          sensor.label || sensor.key,
          String(stats.count),
          String(stats.avg),
          String(stats.min),
          String(stats.max),
          String(stats.median),
          String(stats.p90),
          String(stats.p95),
          String(stats.p99),
          sensor.unit || "",
        ])
      }
    })

    // Add "Total" row
    const allSensorValues = []
    sensors.forEach(s => {
      if (s.type === "heater" || s.type === "actuator") return
      realtimeData.forEach(r => {
        const v = r[s.key]
        if (typeof v === "number" && !isNaN(v)) allSensorValues.push(v)
      })
    })
    const totalStats = calcStats(allSensorValues)
    if (totalStats) {
      statRows.push([
        "Total (All Sensors)",
        String(totalStats.count),
        String(totalStats.avg),
        String(totalStats.min),
        String(totalStats.max),
        String(totalStats.median),
        String(totalStats.p90),
        String(totalStats.p95),
        String(totalStats.p99),
        "-",
      ])
    }

    if (statRows.length > 0) {
      autoTable(pdf, {
        startY: y,
        head: [["Sensor", "#Samples", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Unit"]],
        body: statRows,
        theme: "grid",
        headStyles: { fillColor: COLORS.tableHeaderBg, textColor: COLORS.tableHeaderText, fontSize: 7.5, fontStyle: "bold", halign: "center" },
        styles: { fontSize: 7.5, cellPadding: 2, halign: "center" },
        alternateRowStyles: { fillColor: COLORS.tableAltRow },
        margin: { left: 10, right: 10 },
        columnStyles: { 0: { halign: "left", fontStyle: "bold" } },
        didParseCell: (data) => {
          // Bold the "Total" row
          if (data.section === "body" && data.row.index === statRows.length - 1) {
            data.cell.styles.fontStyle = "bold"
            data.cell.styles.fillColor = [220, 235, 245]
          }
        },
      })
      y = pdf.lastAutoTable.finalY + 10
    }
  } else {
    pdf.setFontSize(9)
    pdf.setTextColor(...COLORS.textMuted)
    pdf.text("Tidak ada data sensor yang tersedia.", 15, y)
    y += 8
  }

  // ═══════════════════════════════════════════════
  // SECTION: AI Predictions Summary
  // ═══════════════════════════════════════════════
  if (aiData.length > 0) {
    checkPage(40)
    drawSectionHeader("AI Predictions Summary")

    const aiRows = aiData.slice(0, 100).map((ai) => [
      formatDate(ai._date),
      ai.risk_status || "-",
      ai.predicted_temperature_30min != null ? String(parseFloat(ai.predicted_temperature_30min).toFixed(2)) : "-",
      ai.predicted_ph_30min != null ? String(parseFloat(ai.predicted_ph_30min).toFixed(2)) : "-",
      ai.predicted_do_30min != null ? String(parseFloat(ai.predicted_do_30min).toFixed(2)) : "-",
      ai.heater_status || "-",
      (Array.isArray(ai.recommendations) ? ai.recommendations.map(r => typeof r === 'string' ? r : (r?.detail || r?.message || JSON.stringify(r))).join("; ") : "-").substring(0, 80) || "-",
    ])

    autoTable(pdf, {
      startY: y,
      head: [["Timestamp", "Risk", "Pred. Suhu", "Pred. pH", "Pred. DO", "Heater", "Rekomendasi"]],
      body: aiRows,
      theme: "grid",
      headStyles: { fillColor: COLORS.tableHeaderBg, textColor: COLORS.tableHeaderText, fontSize: 7, fontStyle: "bold", halign: "center" },
      styles: { fontSize: 6.5, cellPadding: 1.5 },
      alternateRowStyles: { fillColor: COLORS.tableAltRow },
      margin: { left: 10, right: 10 },
      columnStyles: { 6: { cellWidth: 60 } },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 1) {
          const val = String(data.cell.raw).toLowerCase()
          if (val.includes("aman") || val.includes("safe")) data.cell.styles.textColor = COLORS.pass
          else if (val.includes("waspada") || val.includes("warn")) data.cell.styles.textColor = [180, 160, 0]
          else if (val.includes("bahaya") || val.includes("danger")) data.cell.styles.textColor = COLORS.fail
        }
      },
    })
    y = pdf.lastAutoTable.finalY + 10
  }

  // ═══════════════════════════════════════════════
  // SECTION: FCR Records Summary
  // ═══════════════════════════════════════════════
  if (fcrData.length > 0) {
    checkPage(40)
    drawSectionHeader("FCR Predictions Summary")

    const fcrRows = fcrData.slice(0, 100).map((fcr) => {
      const input = fcr.input || {}
      const metrics = fcr.metrics || {}
      const predictions = fcr.predictions || {}
      return [
        formatDate(fcr._date),
        String(input.siklus ?? "-"),
        String(input.DOC ?? "-"),
        String(input.populasi ?? "-"),
        predictions.predicted_FCR != null ? String(parseFloat(predictions.predicted_FCR).toFixed(3)) : "-",
        predictions.predicted_ADG != null ? String(parseFloat(predictions.predicted_ADG).toFixed(3)) : "-",
        metrics.efisiensi_status || "-",
        metrics.survival_rate != null ? `${parseFloat(metrics.survival_rate).toFixed(1)}%` : "-",
      ]
    })

    autoTable(pdf, {
      startY: y,
      head: [["Timestamp", "Siklus", "DOC", "Populasi", "FCR", "ADG", "Efisiensi", "Survival Rate"]],
      body: fcrRows,
      theme: "grid",
      headStyles: { fillColor: COLORS.tableHeaderBg, textColor: COLORS.tableHeaderText, fontSize: 7.5, fontStyle: "bold", halign: "center" },
      styles: { fontSize: 7.5, cellPadding: 2, halign: "center" },
      alternateRowStyles: { fillColor: COLORS.tableAltRow },
      margin: { left: 10, right: 10 },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 6) {
          const val = String(data.cell.raw).toLowerCase()
          if (val.includes("efisien")) data.cell.styles.textColor = COLORS.pass
          else if (val.includes("normal")) data.cell.styles.textColor = [180, 160, 0]
          else data.cell.styles.textColor = COLORS.fail
        }
      },
    })
    y = pdf.lastAutoTable.finalY + 10
  }

  // ═══════════════════════════════════════════════
  // SECTION: Realtime Data Table (Detail)
  // ═══════════════════════════════════════════════
  if (realtimeData.length > 0) {
    checkPage(40)
    drawSectionHeader("Realtime Data (Detail)")

    // Build columns dynamically from sensor keys
    const dataKeys = []
    if (sensors.length > 0) {
      sensors.forEach(s => {
        if (!dataKeys.includes(s.key)) dataKeys.push(s.key)
      })
    } else {
      // Fallback: extract keys from first record
      const sampleKeys = Object.keys(realtimeData[0] || {}).filter(k =>
        !["id", "_date", "timestamp", "userId", "kolamId"].includes(k) && !k.startsWith("status_")
      )
      dataKeys.push(...sampleKeys)
    }

    const headers = ["#", "Timestamp", ...dataKeys.map(k => {
      const sensorConfig = sensors.find(s => s.key === k)
      return sensorConfig ? `${sensorConfig.label}${sensorConfig.unit ? ` (${sensorConfig.unit})` : ""}` : k
    })]

    // Limit to 500 rows for PDF performance
    const maxRows = Math.min(realtimeData.length, 500)
    const detailRows = realtimeData.slice(0, maxRows).map((r, i) => {
      const row = [String(i + 1), formatDate(r._date)]
      dataKeys.forEach(k => {
        const val = r[k]
        if (val === undefined || val === null) row.push("-")
        else if (typeof val === "boolean") row.push(val ? "ON" : "OFF")
        else if (typeof val === "number") row.push(String(parseFloat(val.toFixed(2))))
        else row.push(String(val))
      })
      return row
    })

    autoTable(pdf, {
      startY: y,
      head: [headers],
      body: detailRows,
      theme: "grid",
      headStyles: { fillColor: COLORS.tableHeaderBg, textColor: COLORS.tableHeaderText, fontSize: 6.5, fontStyle: "bold", halign: "center" },
      styles: { fontSize: 6, cellPadding: 1.5, halign: "center" },
      alternateRowStyles: { fillColor: COLORS.tableAltRow },
      margin: { left: 10, right: 10 },
      columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 35, halign: "left" } },
    })

    if (realtimeData.length > maxRows) {
      y = pdf.lastAutoTable.finalY + 3
      pdf.setFontSize(7)
      pdf.setTextColor(...COLORS.textMuted)
      pdf.text(`* Menampilkan ${maxRows} dari ${realtimeData.length} record. Gunakan ekspor Excel untuk data lengkap.`, 10, y)
    }
  }

  // ═══════════════════════════════════════════════
  // FOOTER on all pages
  // ═══════════════════════════════════════════════
  const totalPages = pdf.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i)
    pdf.setFontSize(7)
    pdf.setTextColor(...COLORS.textMuted)
    pdf.text(
      `SMIKOLE Report — ${pondName} — Generated ${new Date().toISOString()} — Page ${i} of ${totalPages}`,
      pageW / 2, pageH - 5, { align: "center" }
    )
  }

  // ═══════════════════════════════════════════════
  // Save
  // ═══════════════════════════════════════════════
  const filename = `SMIKOLE_Report_${pondId}_${periodLabel.replace(/\s+/g, "_")}_${Date.now()}.pdf`
  pdf.save(filename)
  return filename
}
