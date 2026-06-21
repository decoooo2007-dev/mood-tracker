import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const FEEDBACK_EMAIL = process.env.FEEDBACK_EMAIL || "feedback@moodflow.app";

export async function POST(request: NextRequest) {
  try {
    const { rating, message } = await request.json();

    if (!rating || !message) {
      return NextResponse.json(
        { error: "Rating and message are required" },
        { status: 400 }
      );
    }

    if (message.length < 10) {
      return NextResponse.json(
        { error: "Message is too short" },
        { status: 400 }
      );
    }

    // Rating stars
    const stars = "⭐".repeat(rating);

    // If RESEND_API_KEY is not set, log feedback and return success (for development)
    if (!process.env.RESEND_API_KEY) {
      console.log("📧 Feedback received (no API key configured):", {
        rating,
        stars,
        message: message.substring(0, 100),
      });
      return NextResponse.json({ success: true, dev: true });
    }

    // Send email
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "MoodFlow Feedback <onboarding@resend.dev>",
      to: FEEDBACK_EMAIL,
      subject: `${stars} Feedback: ${rating}/5 - ${message.substring(0, 50)}...`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #7C3AED;">New MoodFlow Feedback</h2>
          <div style="background: #F3F4F6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0; font-size: 18px;">${stars} <strong>${rating}/5</strong></p>
          </div>
          <h3 style="color: #374151;">Message:</h3>
          <p style="color: #6B7280; white-space: pre-wrap;">${message}</p>
          <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
          <p style="color: #9CA3AF; font-size: 12px;">
            Sent from MoodFlow App
          </p>
        </div>
      `,
      replyTo: FEEDBACK_EMAIL,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Feedback error:", error);
    return NextResponse.json(
      { error: "Failed to send feedback" },
      { status: 500 }
    );
  }
}
