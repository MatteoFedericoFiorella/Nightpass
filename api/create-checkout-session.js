export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { booking, successUrl, cancelUrl } = req.body || {};

    if (!booking || !booking.total) {
      return res.status(400).json({ error: "Missing booking data" });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
      return res.status(500).json({ error: "Missing STRIPE_SECRET_KEY" });
    }

    const amount = Math.round(Number(booking.total) * 100);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const params = new URLSearchParams();

    params.append("mode", "payment");
    params.append("success_url", successUrl);
    params.append("cancel_url", cancelUrl);
    params.append("payment_method_types[]", "card");

    params.append("line_items[0][price_data][currency]", "eur");
    params.append("line_items[0][price_data][product_data][name]", `NightPass - ${booking.area}`);
    params.append(
      "line_items[0][price_data][product_data][description]",
      `${booking.city} - ${booking.venue} - ${booking.date || "data da definire"}`
    );
    params.append("line_items[0][price_data][unit_amount]", String(amount));
    params.append("line_items[0][quantity]", "1");

    params.append("customer_email", booking.email || "");

    params.append("metadata[city]", booking.city || "");
    params.append("metadata[venue]", booking.venue || "");
    params.append("metadata[date]", booking.date || "");
    params.append("metadata[guests]", String(booking.guests || ""));
    params.append("metadata[area]", booking.area || "");
    params.append("metadata[name]", booking.name || "");
    params.append("metadata[phone]", booking.phone || "");

    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = await stripeResponse.json();

    if (!stripeResponse.ok) {
      return res.status(500).json({
        error: data?.error?.message || "Stripe session creation failed",
      });
    }

    return res.status(200).json({ url: data.url });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Unknown server error",
    });
  }
}
