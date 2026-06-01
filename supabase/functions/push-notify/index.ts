/**
 * Nutriva — Push Notification Edge Function
 * 
 * Triggered by a Supabase Database Webhook when a row is inserted into `notifications`.
 * Reads the user's push_token from profiles and calls Expo Push API.
 * 
 * Setup:
 * 1. Deploy: supabase functions deploy push-notify
 * 2. Set secret: supabase secrets set EXPO_PUSH_ACCESS_TOKEN=<your-token>
 * 3. Create webhook in Supabase Dashboard:
 *    - Table: notifications
 *    - Event: INSERT
 *    - HTTP Request → POST to your function URL
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

serve(async (req: Request) => {
  try {
    const { record } = await req.json();
    
    if (!record) {
      return new Response(JSON.stringify({ error: 'No record in payload' }), { status: 400 });
    }

    const { user_id, title, body } = record;

    // If user_id is null, it's a broadcast — skip push (admin-only notification)
    if (!user_id) {
      return new Response(JSON.stringify({ message: 'Broadcast notification, no push needed' }), { status: 200 });
    }

    // Create Supabase admin client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch user's push token
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('push_token, name')
      .eq('id', user_id)
      .single();

    if (error || !profile?.push_token) {
      return new Response(
        JSON.stringify({ message: 'No push token for user', user_id }),
        { status: 200 }
      );
    }

    // Send push notification via Expo
    const pushPayload = {
      to: profile.push_token,
      title: title || 'Nutriva',
      body: body || 'You have a new notification',
      sound: 'default',
      data: { type: record.type || 'general' },
    };

    const expoPushToken = Deno.env.get('EXPO_PUSH_ACCESS_TOKEN');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (expoPushToken) {
      headers['Authorization'] = `Bearer ${expoPushToken}`;
    }

    const pushResponse = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(pushPayload),
    });

    const pushResult = await pushResponse.json();

    return new Response(
      JSON.stringify({ success: true, pushResult }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500 }
    );
  }
});
