/**
 * Hook untuk cek status koneksi sensor
 * Jika data tidak update selama 5 menit → "terputus"
 */

import { useState, useEffect, useRef } from "react"
import { db } from "../services/firebase"
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore"

const STALE_TIMEOUT = 5 * 60 * 1000 // 5 menit dalam ms
const CHECK_INTERVAL = 30 * 1000     // Cek setiap 30 detik

export function useConnectionStatus(pondId = "kolam1") {
  const [isConnected, setIsConnected] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const lastUpdatedRef = useRef(null)

  // Keep ref in sync
  useEffect(() => {
    lastUpdatedRef.current = lastUpdated
  }, [lastUpdated])

  useEffect(() => {
    if (!pondId) return

    // Subscribe ke data sensor terbaru
    const collectionRef = collection(db, "ponds", pondId, "realtime")
    const q = query(collectionRef, orderBy("timestamp", "desc"), limit(1))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data()
        let ts = null

        if (data.timestamp) {
          if (typeof data.timestamp === "number" || typeof data.timestamp === "string") {
            ts = new Date(parseInt(data.timestamp))
          } else if (data.timestamp.toDate) {
            ts = data.timestamp.toDate()
          }
        }

        if (ts) {
          setLastUpdated(ts)
          setIsConnected(Date.now() - ts.getTime() < STALE_TIMEOUT)
        }
      }
    })

    // Interval untuk re-check staleness
    const interval = setInterval(() => {
      if (lastUpdatedRef.current) {
        setIsConnected(Date.now() - lastUpdatedRef.current.getTime() < STALE_TIMEOUT)
      }
    }, CHECK_INTERVAL)

    return () => {
      unsubscribe()
      clearInterval(interval)
    }
  }, [pondId])

  return { isConnected, lastUpdated }
}
