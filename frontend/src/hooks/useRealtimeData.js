import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

export const useRealtimeData = (tableName) => {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Fetch initial data
        const fetchData = async () => {
            const { data: initialData, error } = await supabase
                .from(tableName)
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(100)

            if (error) {
                console.error('Error fetching data:', error)
            } else {
                setData(initialData)
            }
            setLoading(false)
        }

        fetchData()

        // Subscribe to real-time changes
        const subscription = supabase
            .channel(`${tableName}_changes`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: tableName },
                (payload) => {
                    console.log('Real-time update:', payload)
                    if (payload.eventType === 'INSERT') {
                        setData((current) => [payload.new, ...current].slice(0, 100))
                    }
                }
            )
            .subscribe()

        return () => {
            subscription.unsubscribe()
        }
    }, [tableName])

    return { data, loading }
}