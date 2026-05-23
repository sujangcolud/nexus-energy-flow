import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

/**
 * PRODUCTION-READY SUPABASE OCPP BRIDGE
 * Acts as a Central System (CSMS) for EV Chargers via WebSocket (OCPP 1.6-J).
 */

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve((req) => {
  const upgrade = req.headers.get("upgrade") || "";
  if (upgrade.toLowerCase() != "websocket") {
    return new Response("OCPP Central System: Please connect via WebSocket", { status: 426 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  // Extract ChargerId from path: /functions/v1/charger-bridge/theego084
  const url = new URL(req.url);
  const chargerId = url.pathname.split('/').pop() || 'unknown';

  socket.onopen = () => console.log(`[CSMS] Charger Connected: ${chargerId}`);

  socket.onmessage = async (e) => {
    try {
      const message = JSON.parse(e.data);
      const [messageTypeId, messageId, action, payload] = message;

      if (messageTypeId === 2) { // CALL
        console.log(`[OCPP] Received ${action} from ${chargerId}`);

        let responsePayload = {};
        const timestamp = new Date().toISOString();

        // 1. Handle Protocol Logic
        if (action === 'BootNotification') {
          responsePayload = { status: 'Accepted', currentTime: timestamp, interval: 300 };
          await updateChargerStatus(chargerId, { status: 'Online' });
        }
        else if (action === 'Heartbeat') {
          responsePayload = { currentTime: timestamp };
        }
        else if (action === 'StatusNotification') {
          await updateChargerStatus(chargerId, { status: payload.status });
        }
        else if (action === 'MeterValues') {
          const metrics = extractMetrics(payload);
          await updateChargerStatus(chargerId, metrics);
        }

        // 2. Send Success Response back to charger
        socket.send(JSON.stringify([3, messageId, responsePayload]));
      }
    } catch (err) {
      console.error(`[OCPP] Error processing message from ${chargerId}:`, err);
    }
  };

  socket.onclose = async () => {
    console.log(`[CSMS] Charger Disconnected: ${chargerId}`);
    await updateChargerStatus(chargerId, { status: 'Offline' });
  };

  return response;
});

/**
 * Persists charger metrics directly into Supabase 'charger_status' table
 */
async function updateChargerStatus(charger_id: string, updates: any) {
  const { error } = await supabase
    .from('charger_status')
    .upsert({
      charger_id,
      ...updates,
      updated_at: new Date().toISOString()
    }, { onConflict: 'charger_id' });

  if (error) console.error("[Database] Upsert Error:", error.message);
}

/**
 * Extracts V, A, kW, and SoC from standard OCPP 1.6 MeterValues
 */
function extractMetrics(payload: any) {
  const metrics: any = { power_kw: 0, voltage: 0, current: 0, soc: 0 };

  payload.meterValue?.forEach((mv: any) => {
    mv.sampledValue?.forEach((sv: any) => {
      const val = parseFloat(sv.value);
      const m = sv.measurand;
      if (m === 'Power.Active.Import') metrics.power_kw = sv.unit === 'W' ? val / 1000 : val;
      if (m === 'Voltage') metrics.voltage = val;
      if (m === 'Current.Import') metrics.current = val;
      if (m === 'SoC') metrics.soc = val;
    });
  });

  return metrics;
}
