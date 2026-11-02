import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const FeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  category: z.enum(["general", "bug", "feature", "design", "other"]).default("general"),
  message: z.string().trim().min(10).max(2000),
});

const CATEGORY_LABELS: Record<"general" | "bug" | "feature" | "design" | "other", string> = {
  general: "General Feedback",
  bug: "Bug Report",
  feature: "Feature Request",
  design: "Design / UI",
  other: "Other",
};

export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateLimit = await checkRateLimit(`feedback:${ip}`, 5, 15 * 60_000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many feedback submissions. Please try again later." },
        { status: 429 }
      );
    }

    const rawBody = await request.json().catch(() => null);
    const parsed = FeedbackSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid feedback payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { rating, category, message } = parsed.data;
    const stars = "⭐".repeat(rating);
    const categoryLabel = CATEGORY_LABELS[category];
    const safeMessageHtml = escapeHtml(message);

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Email service is not configured on the server." },
        { status: 503 }
      );
    }

    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: "MoodFlow Feedback <onboarding@resend.dev>",
      to: [process.env.FEEDBACK_EMAIL || "abdo77samy@gmail.com"],
      subject: `MoodFlow Feedback: ${categoryLabel} (${rating}/5 stars)`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); color: white; border-radius: 16px;">
          <h1 style="color: #a855f7; margin-bottom: 20px;">New Feedback Received</h1>
          <div style="background: rgba(255,255,255,0.1); padding: 16px; border-radius: 12px; margin-bottom: 16px;">
            <p style="margin: 8px 0;"><strong>Rating:</strong> ${stars} (${rating}/5)</p>
            <p style="margin: 8px 0;"><strong>Category:</strong> ${escapeHtml(categoryLabel)}</p>
            <p style="margin: 8px 0;"><strong>Time:</strong> ${new Date().toISOString()}</p>
          </div>
          <div style="background: rgba(255,255,255,0.1); padding: 16px; border-radius: 12px;">
            <h3 style="margin-top: 0; color: #c084fc;">Message:</h3>
            <p style="line-height: 1.6; white-space: pre-wrap;">${safeMessageHtml}</p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("[Feedback API] Resend error:", error);
      return NextResponse.json(
        { error: "Failed to deliver feedback email." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      id: data?.id ?? null,
      message: "Feedback submitted successfully",
    });
  } catch (error) {
    console.error("[Feedback API] Unexpected error:", error);
    return NextResponse.json(
      { error: "Failed to submit feedback" },
      { status: 500 }
    );
  }
}
