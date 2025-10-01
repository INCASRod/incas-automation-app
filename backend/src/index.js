import mqtt from 'mqtt'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
)

// MQTT connection options
const mqttOptions = {
    host: process.env.MQTT_BROKER,
    port: process.env.MQTT_PORT,
    protocol: 'mqtt'
}

// Connect to MQTT broker
const client = mqtt.connect(mqttOptions)

client.on('connect', () => {
    console.log('✅ Connected to MQTT broker')
    client.subscribe(process.env.MQTT_TOPIC, (err) => {
        if (err) {
            console.error('❌ Subscription error:', err)
        } else {
            console.log(`✅ Subscribed to topic: ${process.env.MQTT_TOPIC}`)
        }
    })
})

client.on('message', async (topic, message) => {
    try {
        const data = JSON.parse(message.toString())
        console.log('📨 Received data:', data)

        // Insert data into Supabase
        const { error } = await supabase
            .from('sensor_data')  // Change table name as needed
            .insert({
                ...data,
                timestamp: new Date().toISOString()
            })

        if (error) {
            console.error('❌ Database error:', error)
        } else {
            console.log('✅ Data saved to database')
        }
    } catch (err) {
        console.error('❌ Error processing message:', err)
    }
})

client.on('error', (err) => {
    console.error('❌ MQTT error:', err)
})

console.log('🚀 MQTT Bridge started...')