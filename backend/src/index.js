import mqtt from 'mqtt'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
)

console.log('🚀 Starting Bag Production Monitor...')
console.log(`📡 Connecting to: ${process.env.MQTT_BROKER}`)

const mqttOptions = {
    protocol: process.env.MQTT_PROTOCOL || 'mqtts',
    host: process.env.MQTT_BROKER,
    port: parseInt(process.env.MQTT_PORT),
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    clean: true,
    reconnectPeriod: 5000,
}

const client = mqtt.connect(mqttOptions)

// Track previous bag count to calculate bags per minute
let previousBagCount = null
let previousTimestamp = null

client.on('connect', () => {
    console.log('✅ Connected to MQTT broker')

    // Subscribe to WISE data topics
    const topics = [
        'Advantech/74FE48952DAD/data',
        'Advantech/74FE48952DAD/Device_Status'
    ]

    topics.forEach(topic => {
        client.subscribe(topic, (err) => {
            if (err) {
                console.error(`❌ Failed to subscribe to ${topic}:`, err)
            } else {
                console.log(`✅ Subscribed to: ${topic}`)
            }
        })
    })

    console.log('📬 Waiting for INCAS-C101 bag production data...')
})

client.on('message', async (topic, message) => {
    try {
        const payload = message.toString()

        // Parse JSON
        const data = JSON.parse(payload)

        // Handle different topics
        if (topic.includes('/Device_Status')) {
            console.log('\n📱 Device Status Update:')
            console.log(`   Status: ${data.status}`)
            console.log(`   Device: ${data.name}`)
            console.log(`   MAC: ${data.macid}`)
            console.log(`   IP: ${data.ipaddr}`)
            return
        }

        if (topic.includes('/data')) {
            console.log('\n📦 ====== BAG PRODUCTION DATA ======')
            console.log(`   Timestamp: ${data.t}`)
            console.log(`   Bag Count (DI1): ${data.di1}`)
            console.log(`   DI2: ${data.di2}`)
            console.log(`   DI3: ${data.di3}`)
            console.log(`   DI4: ${data.di4}`)

            // Calculate bags per minute
            let bagsPerMinute = null
            if (previousBagCount !== null && previousTimestamp !== null) {
                const currentTime = new Date(data.t).getTime()
                const previousTime = new Date(previousTimestamp).getTime()
                const timeDiffMinutes = (currentTime - previousTime) / 1000 / 60
                const bagDiff = data.di1 - previousBagCount

                if (timeDiffMinutes > 0) {
                    bagsPerMinute = (bagDiff / timeDiffMinutes).toFixed(2)
                    console.log(`   Production Rate: ${bagsPerMinute} bags/min`)
                }
            }

            // Prepare data for database
            const dbData = {
                device_id: 'INCAS-C101',
                bag_count: data.di1,
                bags_per_minute: bagsPerMinute ? parseFloat(bagsPerMinute) : null,
                line_1_bags: data.di1,      // Main bag counter
                line_2_bags: data.di2 ? 1 : 0,  // DI2 status
                line_3_bags: data.di3 ? 1 : 0,  // DI3 status
                line_4_bags: data.di4 ? 1 : 0,  // DI4 status
                machine_status: data.di2 ? 'running' : 'stopped',
                timestamp: data.t,
                raw_data: data  // Store full payload for reference
            }

            console.log('💾 Saving to database...')

            // Insert into Supabase
            const { error } = await supabase
                .from('bag_production')  // or 'sensor_data' if using old table
                .insert(dbData)

            if (error) {
                console.error('❌ Database error:', error.message)
            } else {
                console.log('✅ Bag production data saved!')
                console.log(`   Total bags: ${data.di1}`)
                if (bagsPerMinute) {
                    console.log(`   Rate: ${bagsPerMinute} bags/min`)
                }
            }

            // Update tracking variables
            previousBagCount = data.di1
            previousTimestamp = data.t
        }
    } catch (err) {
        console.error('❌ Error processing message:', err.message)
        console.error('   Raw payload:', message.toString())
    }
})

client.on('error', (err) => {
    console.error('❌ MQTT error:', err.message)
})

client.on('reconnect', () => {
    console.log('🔄 Reconnecting...')
})

process.on('SIGINT', () => {
    console.log('\n⏹️  Shutting down...')
    client.end()
    process.exit(0)
})