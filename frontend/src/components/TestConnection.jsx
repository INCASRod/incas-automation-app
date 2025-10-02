import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

export default function TestConnection() {
    const [status, setStatus] = useState('Connecting...')
    const [latestData, setLatestData] = useState(null)
    const [recentData, setRecentData] = useState([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetchInitialData()
        subscribeToRealtime()

        // Poll every 5 seconds as backup
        const pollInterval = setInterval(() => {
            fetchLatestData()
        }, 5000)

        return () => {
            clearInterval(pollInterval)
        }
    }, [])

    const fetchInitialData = async () => {
        try {
            const { data, error } = await supabase
                .from('bag_production')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(10)

            if (error) {
                setStatus(`❌ Error: ${error.message}`)
                setIsLoading(false)
            } else {
                setStatus('✅ Connected to Supabase!')
                setRecentData(data)
                if (data.length > 0) {
                    setLatestData(data[0])
                }
                setIsLoading(false)
            }
        } catch (err) {
            setStatus(`❌ Connection failed: ${err.message}`)
            setIsLoading(false)
        }
    }

    const fetchLatestData = async () => {
        try {
            const { data, error } = await supabase
                .from('bag_production')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(10)

            if (!error && data.length > 0) {
                setRecentData(data)
                setLatestData(data[0])
                console.log('🔄 Data refreshed:', data[0].bag_count, 'bags')
            }
        } catch (err) {
            console.error('Polling error:', err)
        }
    }

    const subscribeToRealtime = () => {
        const subscription = supabase
            .channel('bag_production_changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'bag_production'
                },
                (payload) => {
                    console.log('🔴 Real-time update received:', payload.new)
                    setLatestData(payload.new)
                    setRecentData((current) => [payload.new, ...current].slice(0, 10))
                }
            )
            .subscribe()

        return () => {
            subscription.unsubscribe()
        }
    }

    if (isLoading) {
        return <div style={{ padding: '20px' }}>Loading...</div>
    }

    return (
        <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
            <h2>🏭 INCAS Bag Production Monitor</h2>
            <p><strong>{status}</strong></p>

            {latestData && (
                <div style={{
                    background: '#282929ff',
                    border: '2px solid #0ea5e9',
                    borderRadius: '8px',
                    padding: '20px',
                    marginTop: '20px'
                }}>
                    <h3 style={{ marginTop: 0 }}>📦 Live Production Data</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                            <strong>Device:</strong> {latestData.device_id}
                        </div>
                        <div>
                            <strong>Status:</strong> <span style={{
                                color: latestData.machine_status === 'running' ? '#10b981' : '#ef4444',
                                fontWeight: 'bold'
                            }}>
                                {latestData.machine_status?.toUpperCase()}
                            </span>
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0ea5e9' }}>
                            Total Bags: {latestData.bag_count}
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6' }}>
                            Rate: {latestData.bags_per_minute ? `${latestData.bags_per_minute} bags/min` : 'Calculating...'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', gridColumn: '1 / -1' }}>
                            Last Update: {new Date(latestData.timestamp).toLocaleString()}
                        </div>
                    </div>
                </div>
            )}

            {recentData.length > 0 && (
                <div style={{ marginTop: '30px' }}>
                    <h3>📊 Recent Production Data</h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            fontSize: '14px'
                        }}>
                            <thead>
                                <tr style={{ background: '#2e2e2eff', borderBottom: '2px solid #cbd5e1' }}>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>Time</th>
                                    <th style={{ padding: '10px', textAlign: 'right' }}>Bag Count</th>
                                    <th style={{ padding: '10px', textAlign: 'right' }}>Rate (bags/min)</th>
                                    <th style={{ padding: '10px', textAlign: 'center' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentData.map((row, index) => (
                                    <tr key={row.id} style={{
                                        borderBottom: '1px solid #90959bff',
                                        background: index === 0 ? '#474643ff' : 'white'
                                    }}>
                                        <td style={{ padding: '10px' }}>
                                            {new Date(row.timestamp).toLocaleTimeString()}
                                        </td>
                                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>
                                            {row.bag_count}
                                        </td>
                                        <td style={{ padding: '10px', textAlign: 'right' }}>
                                            {row.bags_per_minute?.toFixed(2) || '-'}
                                        </td>
                                        <td style={{ padding: '10px', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                fontSize: '12px',
                                                background: row.machine_status === 'running' ? '#d1fae5' : '#fee2e2',
                                                color: row.machine_status === 'running' ? '#065f46' : '#991b1b'
                                            }}>
                                                {row.machine_status || 'unknown'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {recentData.length === 0 && (
                <p style={{ marginTop: '20px', color: '#64748b' }}>
                    <em>No production data yet. Waiting for WISE-4050 to send data...</em>
                </p>
            )}

            <div style={{
                marginTop: '30px',
                padding: '15px',
                background: '#383838ff',
                borderRadius: '8px',
                fontSize: '14px'
            }}>
                <strong>🔄 Auto-refresh:</strong> Data updates every 5 seconds + real-time when new bags are counted
            </div>
        </div>
    )
}