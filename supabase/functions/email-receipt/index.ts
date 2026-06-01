/**
 * Nutriva — Email Receipt Edge Function
 * 
 * Triggered by a Supabase Database Webhook when a row is inserted into `orders`.
 * Fetches user email from profiles and sends a styled HTML receipt via Resend API.
 * 
 * Setup:
 * 1. Sign up at https://resend.com (free tier: 100 emails/day)
 * 2. Add your sending domain or use onboarding@resend.dev for testing
 * 3. Set secret: supabase secrets set RESEND_API_KEY=<your-key>
 * 4. Deploy: supabase functions deploy email-receipt
 * 5. Create webhook in Supabase Dashboard:
 *    - Table: orders
 *    - Event: INSERT
 *    - HTTP Request → POST to your function URL
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_URL = 'https://api.resend.com/emails';

serve(async (req: Request) => {
  try {
    const { record } = await req.json();
    
    if (!record) {
      return new Response(JSON.stringify({ error: 'No record' }), { status: 400 });
    }

    const { user_id, order_number, items, total, customer_name, address, discount, coupon_code } = record;

    // Create Supabase admin client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch user email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user_id)
      .single();

    if (!profile?.email) {
      return new Response(
        JSON.stringify({ message: 'No email for user' }),
        { status: 200 }
      );
    }

    // Parse items
    const orderItems = typeof items === 'string' ? JSON.parse(items) : items;
    const subtotal = total + (discount || 0);

    // Build HTML receipt
    const itemRows = (orderItems || []).map((item: any) => `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: center;">${item.qty}</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right;">₹${(item.price * item.qty).toLocaleString()}</td>
      </tr>
    `).join('');

    const discountRow = (discount && discount > 0) ? `
      <tr>
        <td colspan="2" style="padding: 8px 0; color: #43A047;">Discount (${coupon_code || 'Promo'})</td>
        <td style="padding: 8px 0; text-align: right; color: #43A047;">-₹${discount.toLocaleString()}</td>
      </tr>
    ` : '';

    const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f7f5;">
      <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.06);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #1B5E20, #2E7D32); padding: 32px 24px; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 24px;">🍎 Nutriva</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0;">Order Confirmation</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 24px;">
            <p style="color: #2E4A26; font-size: 16px;">Hi ${customer_name},</p>
            <p style="color: #666; line-height: 1.6;">
              Thank you for your order! Here's your receipt for order <strong>${order_number}</strong>.
            </p>

            <!-- Order Details -->
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead>
                <tr style="border-bottom: 2px solid #2E7D32;">
                  <th style="text-align: left; padding: 8px 0; color: #1B3C12;">Item</th>
                  <th style="text-align: center; padding: 8px 0; color: #1B3C12;">Qty</th>
                  <th style="text-align: right; padding: 8px 0; color: #1B3C12;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemRows}
                ${discountRow}
                <tr>
                  <td colspan="2" style="padding: 14px 0; font-weight: 700; font-size: 16px; color: #1B3C12;">Total</td>
                  <td style="padding: 14px 0; text-align: right; font-weight: 800; font-size: 18px; color: #2E7D32;">₹${total.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            ${address ? `
            <div style="background: #f5f7f5; border-radius: 8px; padding: 14px; margin: 16px 0;">
              <p style="margin: 0; color: #666; font-size: 13px;">📍 Delivery Address</p>
              <p style="margin: 4px 0 0; color: #2E4A26; font-weight: 500;">${address}</p>
            </div>
            ` : ''}

            <p style="color: #999; font-size: 13px; margin-top: 24px; text-align: center;">
              Questions? Reply to this email or use the in-app chat.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background: #f5f7f5; padding: 16px 24px; text-align: center;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              🍃 Fresh from orchard to your door — Nutriva
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>`;

    // Send via Resend
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      return new Response(
        JSON.stringify({ message: 'RESEND_API_KEY not configured' }),
        { status: 200 }
      );
    }

    const emailResponse = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: 'Nutriva <orders@nutriva.app>',
        to: [profile.email],
        subject: `Order Confirmed — ${order_number}`,
        html,
      }),
    });

    const emailResult = await emailResponse.json();

    return new Response(
      JSON.stringify({ success: true, emailResult }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500 }
    );
  }
});
