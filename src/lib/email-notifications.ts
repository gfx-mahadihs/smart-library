export interface DueReminderEmail {
  to: string;
  subject: string;
  body: string;
}

export async function sendDueReminderEmail(email: DueReminderEmail): Promise<boolean> {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) {
    console.info("[email] RESEND_API_KEY not configured; reminder skipped.");
    return false;
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env["EMAIL_FROM"] ?? "গ্রন্থাগার <notifications@example.com>",
        to: [email.to],
        subject: email.subject,
        text: email.body,
      }),
    });
    if (!response.ok) {
      console.error("[email] provider rejected reminder:", response.status);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[email] reminder send failed:", error);
    return false;
  }
}
