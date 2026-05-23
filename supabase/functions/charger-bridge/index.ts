import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

/**
 * PRODUCTION-READY SUPABASE OCPP BRIDGE (CSMS)
 * Supports multiple chargers, status tracking, and PERSISTENT transaction handling.
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

  // Extract ChargerId from path: /functions/v1/charger-bridge/{chargerId}
  const url = new URL(req.url);
  const chargerId = url.pathname.split('/').pop() || 'unknown';

  socket.onopen = async () => {
    console.log(`[CSMS] Charger Connected: ${chargerId}`);
    await updateChargerStatus(chargerId, { status: 'Online' });
  };

  socket.onmessage = async (e) => {
    try {
      const message = JSON.parse(e.data);
      const [messageTypeId, messageId, action, payload] = message;

      if (messageTypeId === 2) { // CALL
        console.log(`[OCPP] Received ${action} from ${chargerId}`);

        let responsePayload = {};
        const timestamp = new Date().toISOString();

        switch (action) {
          case 'BootNotification':
            responsePayload = { status: 'Accepted', currentTime: timestamp, interval: 300 };
            await updateChargerStatus(chargerId, { status: 'Online' });
            break;

          case 'Heartbeat':
            responsePayload = { currentTime: timestamp };
            break;

          case 'StatusNotification':
            if (payload.connectorId === 0) {
              await updateChargerStatus(chargerId, { status: payload.status });
            } else {
              await updateConnectorStatus(chargerId, payload.connectorId, { status: payload.status });
            }
            break;

          case 'MeterValues': {
            const metrics = extractMetrics(payload);

            // Update Connector Status
            if (payload.connectorId !== 0) {
              await updateConnectorStatus(chargerId, payload.connectorId, metrics);
            }

            // AGGREGATE for Charger Status (Sum power across connectors for main dashboard)
            const { data: connectors } = await supabase
              .from('charger_connectors')
              .select('power_kw, current, voltage, soc')
              .eq('charger_id', chargerId);

            const totalPower = connectors?.reduce((sum, c) => sum + (c.power_kw || 0), 0) || 0;
            const avgSoc = connectors?.length ? (connectors.reduce((sum, c) => sum + (c.soc || 0), 0) / connectors.length) : 0;

            await updateChargerStatus(chargerId, {
              power_kw: totalPower,
              soc: payload.connectorId === 0 ? metrics.soc : avgSoc,
              voltage: metrics.voltage || undefined,
              current: metrics.current || undefined
            });

            // RECORD granular historical data
            await recordMeterValues(chargerId, payload.connectorId, payload.transactionId, metrics);
            break;
          }

          case 'StartTransaction': {
            const txId = Math.floor(Math.random() * 1000000).toString();
            responsePayload = {
              idTagInfo: { status: 'Accepted' },
              transactionId: parseInt(txId)
            };

            // Fetch current SoC if available from charger_status or connectors
            const { data: connector } = await supabase
              .from('charger_connectors')
              .select('soc')
              .eq('charger_id', chargerId)
              .eq('connector_id', payload.connectorId)
              .single();

            // PERSIST transaction to database
            await supabase.from('charger_transactions').insert({
                transaction_id: txId,
                charger_id: chargerId,
                connector_id: payload.connectorId,
                id_tag: payload.idTag,
                start_meter: payload.meterStart,
                start_time: timestamp,
                initial_soc: connector?.soc || 0,
                is_active: true
            });

            await updateChargerStatus(chargerId, { status: 'Charging' });
            break;
          }

          case 'StopTransaction': {
            responsePayload = { idTagInfo: { status: 'Accepted' } };

            // FETCH persisted transaction using transactionId from payload
            const { data: tx } = await supabase
                .from('charger_transactions')
                .select('*')
                .eq('transaction_id', payload.transactionId.toString())
                .single();

            if (tx) {
              const result = await recordCompletedSession(chargerId, tx, payload, timestamp);

              // Update transaction record with final details
              await supabase
                .from('charger_transactions')
                .update({
                  is_active: false,
                  end_time: timestamp,
                  end_meter: payload.meterStop,
                  final_soc: result.finalSoc,
                  total_energy_kwh: result.consumedUnits,
                  total_cost: result.totalCost
                })
                .eq('transaction_id', tx.transaction_id);
            }

            // Set status to Available if all transactions are closed
            const { count } = await supabase
                .from('charger_transactions')
                .select('*', { count: 'exact', head: true })
                .eq('charger_id', chargerId)
                .eq('is_active', true);

            if (count === 0) {
              await updateChargerStatus(chargerId, { status: 'Available', power_kw: 0, current: 0 });
            }
            break;
          }

          case 'Authorize':
            responsePayload = { idTagInfo: { status: 'Accepted' } };
            break;

          default:
            console.warn(`[OCPP] Unhandled action: ${action}`);
            responsePayload = {};
        }

        // Send Success Response back to charger
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

  if (error) console.error("[Database] Status Update (Charger) Error:", error.message);
}

/**
 * Persists connector metrics directly into Supabase 'charger_connectors' table
 */
async function updateConnectorStatus(charger_id: string, connector_id: number, updates: any) {
  const { error } = await supabase
    .from('charger_connectors')
    .upsert({
      charger_id,
      connector_id,
      ...updates,
      updated_at: new Date().toISOString()
    }, { onConflict: 'charger_id, connector_id' });

  if (error) console.error("[Database] Status Update (Connector) Error:", error.message);
}

/**
 * Records granular meter values for historical charting
 */
async function recordMeterValues(charger_id: string, connector_id: number, transaction_id: any, metrics: any) {
  const { error } = await supabase
    .from('charger_meter_values')
    .insert({
      charger_id,
      connector_id,
      transaction_id: transaction_id?.toString(),
      ...metrics,
      timestamp: new Date().toISOString()
    });

  if (error) console.error("[Database] Meter Recording Error:", error.message);
}

/**
 * Records the completed session into the business management system
 */
async function recordCompletedSession(chargerId: string, tx: any, payload: any, endTime: string) {
  console.log(`[CSMS] Recording session for ${chargerId}:`, { tx, payload });

  // Calculate consumed energy (Wh to kWh/Units)
  const consumedUnits = Math.max(0, (payload.meterStop - tx.start_meter) / 1000);

  // Fetch charger specific rate
  const { data: charger } = await supabase
    .from('charger_status')
    .select('price_per_kwh')
    .eq('charger_id', chargerId)
    .single();

  const rate = charger?.price_per_kwh || 15;

  // Fetch final SoC
  const { data: connector } = await supabase
    .from('charger_connectors')
    .select('soc')
    .eq('charger_id', chargerId)
    .eq('connector_id', tx.connector_id)
    .single();

  // Fetch a default user_id or handle it as a system entry
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .limit(1)
    .single();

  const userId = profile?.id || '00000000-0000-0000-0000-000000000000';

  const totalCost = consumedUnits * rate;

  // Record in charging_sessions table
  const { error } = await supabase.from('charging_sessions').insert({
    charger_id: chargerId,
    connector_id: tx.connector_id,
    kcal: consumedUnits,
    total_amount: totalCost,
    payment_mode: 'Auto-Bill',
    session_date: new Date().toISOString().split('T')[0],
    user_id: userId
  });

  if (error) console.error("[Database] Session Recording Error:", error.message);

  return {
    consumedUnits,
    totalCost,
    finalSoc: connector?.soc || 0
  };
}

/**
 * Extracts V, A, kW, and SoC from standard OCPP 1.6 MeterValues
 */
function extractMetrics(payload: any) {
  const metrics: any = { power_kw: 0, voltage: 0, current: 0, soc: 0 };

  payload.meterValue?.forEach((mv: any) => {
    mv.sampledValue?.forEach((sv: any) => {
      const val = parseFloat(sv.value);
      if (isNaN(val)) return;

      const m = sv.measurand;
      if (m === 'Power.Active.Import') metrics.power_kw = sv.unit === 'W' ? val / 1000 : val;
      else if (m === 'Voltage') metrics.voltage = val;
      else if (m === 'Current.Import') metrics.current = val;
      else if (m === 'SoC') metrics.soc = val;
    });
  });

  return metrics;
}
