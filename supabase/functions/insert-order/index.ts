import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export default async (req: Request) => {
  try {
    // Get the session from the request
    const {
      data: { session },
    } = await createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      },
    ).auth.getSession();

    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create admin client for database operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const {
      user_id,
      item_name,
      quantity,
      rate,
      total,
      payment_mode,
      order_date,
    } = await req.json();

    // Insert order with proper error handling for trigger issues
    const { data, error } = await supabase
      .from("orders")
      .insert([
        {
          user_id,
          item_name,
          quantity,
          rate,
          total,
          payment_mode,
          order_date,
          // Add date field to satisfy any triggers
          date: order_date,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error inserting order:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ data }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
